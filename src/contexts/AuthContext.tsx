import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export const PIN_LENGTH = 6;

export const normalizePin = (pin: string) => pin.replace(/\D/g, "").slice(0, PIN_LENGTH);

const PIN_ERRORS: Record<string, string> = {
  invalid_pin: `Ingresá un PIN de ${PIN_LENGTH} dígitos.`,
  pin_taken: "Ese PIN ya está en uso. Probá con otro.",
  invalid_credentials: "Ese PIN no existe. Creá una cuenta nueva.",
  signup_failed: "No se pudo crear la cuenta. Probá con otro PIN.",
};

// El PIN se verifica en el servidor: la contraseña interna se deriva con un
// secreto que nunca sale del backend, así no se puede calcular desde el navegador.
const pinAuth = async (action: "signin" | "signup", pin: string, fullName?: string) => {
  const { data, error } = await supabase.functions.invoke("pin-auth", {
    body: { action, pin, fullName },
  });

  const code: string | undefined = (data as any)?.error;
  if (error || code || !(data as any)?.access_token) {
    throw new Error(
      (code && PIN_ERRORS[code]) ||
        (action === "signup"
          ? "No se pudo crear la cuenta. Probá de nuevo."
          : "No se pudo iniciar sesión. Revisá el PIN."),
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: (data as any).access_token,
    refresh_token: (data as any).refresh_token,
  });
  if (sessionError) throw sessionError;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (pin: string, fullName: string) => Promise<void>;
  signIn: (pin: string) => Promise<void>;
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

  const signUp = async (pin: string, fullName: string) => {
    await pinAuth("signup", pin, fullName);
  };

  const signIn = async (pin: string) => {
    await pinAuth("signin", pin);
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
