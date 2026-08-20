import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export const normalizePin = (pin: string) => pin.replace(/\D/g, "").slice(0, 4);

const pinToEmail = (pin: string) => `pin-${pin}@viatto.app`;
const pinToPassword = (pin: string) => `viatto-pin-${pin}-2026`;

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
    const { error } = await supabase.auth.signUp({
      email: pinToEmail(pin),
      password: pinToPassword(pin),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, username: pin },
      },
    });

    if (error) {
      // Si el PIN ya existe, intentamos ingresar directamente con él.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pinToEmail(pin),
        password: pinToPassword(pin),
      });
      if (!signInError) return;
      throw error;
    }

    // Con auto-confirmación activada la sesión llega en el signUp; si no,
    // iniciamos sesión explícitamente para no depender del correo.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pinToEmail(pin),
        password: pinToPassword(pin),
      });
      if (signInError) throw signInError;
    }
  };


  const signIn = async (pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: pinToEmail(pin),
      password: pinToPassword(pin),
    });
    if (error) throw error;
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
