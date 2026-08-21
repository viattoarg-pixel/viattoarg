import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export const PIN_LENGTH = 6;
export const CODE_LENGTH = 8;

export const normalizePin = (pin: string) => pin.replace(/\D/g, "").slice(0, PIN_LENGTH);
export const normalizeCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);

const CODE_STORAGE_KEY = "viatto.accountCode";

export const getStoredAccountCode = () => {
  try {
    return localStorage.getItem(CODE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const storeAccountCode = (code: string) => {
  try {
    localStorage.setItem(CODE_STORAGE_KEY, code);
  } catch {
    /* almacenamiento no disponible */
  }
};

export const clearStoredAccountCode = () => {
  try {
    localStorage.removeItem(CODE_STORAGE_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
};

export class CodeRequiredError extends Error {
  constructor(message = "Ingresá tu código de cuenta para entrar en este dispositivo.") {
    super(message);
    this.name = "CodeRequiredError";
  }
}

const PIN_ERRORS: Record<string, string> = {
  invalid_pin: `Ingresá un PIN de ${PIN_LENGTH} dígitos.`,
  invalid_credentials: "El PIN o el código de cuenta no coinciden.",
  invalid_code: "El código de cuenta no coincide con ese PIN.",
  signup_failed: "No se pudo crear la cuenta. Probá de nuevo.",
};

// El PIN nunca alcanza por sí solo: el servidor combina el PIN con un código de
// cuenta aleatorio y un secreto propio del backend para derivar las credenciales.
const pinAuth = async (
  action: "signin" | "signup",
  pin: string,
  opts: { fullName?: string; accountCode?: string } = {},
): Promise<string | undefined> => {
  const { data, error } = await supabase.functions.invoke("pin-auth", {
    body: { action, pin, fullName: opts.fullName, accountCode: opts.accountCode },
  });

  const code: string | undefined = (data as any)?.error;
  if (code === "code_required") throw new CodeRequiredError();
  if (error || code || !(data as any)?.access_token) {
    throw new Error(
      (code && PIN_ERRORS[code]) ||
        (action === "signup"
          ? "No se pudo crear la cuenta. Probá de nuevo."
          : "No se pudo iniciar sesión. Revisá los datos."),
    );
  }

  const accountCode: string | undefined = (data as any).accountCode;
  if (accountCode) storeAccountCode(accountCode);
  else if (opts.accountCode) storeAccountCode(opts.accountCode);

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: (data as any).access_token,
    refresh_token: (data as any).refresh_token,
  });
  if (sessionError) throw sessionError;

  return accountCode;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (pin: string, fullName: string) => Promise<string | undefined>;
  signIn: (pin: string, accountCode?: string) => Promise<string | undefined>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = (pin: string, fullName: string) => pinAuth("signup", pin, { fullName });

  const signIn = async (pin: string, accountCode?: string) => {
    const usedStored = !accountCode;
    const code = accountCode ?? getStoredAccountCode();
    try {
      return await pinAuth("signin", pin, { accountCode: code });
    } catch (error) {
      // Si el código guardado en este dispositivo pertenece a otra cuenta/PIN,
      // lo descartamos y pedimos el código correcto en lugar de fallar en loop.
      if (usedStored && code && !(error instanceof CodeRequiredError)) {
        clearStoredAccountCode();
        throw new CodeRequiredError(
          "El código guardado en este dispositivo no coincide con ese PIN. Ingresá tu código de cuenta.",
        );
      }
      throw error;
    }
  };


  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
