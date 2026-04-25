"use client";

import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
type SignInPayload = { email: string; password: string };

type SignUpPayload = {
  email: string;
  password: string;
  nom: string;
  prenom: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Initialisation : récupérer la session depuis Supabase */
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session: nextSession }
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(nextSession);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    /* Écouter les changements d'état d'authentification */
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* Connexion avec email et mot de passe */
  const signIn = useCallback(async (payload: SignInPayload) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /* Inscription : crée le compte Supabase Auth */
  const signUp = useCallback(async (payload: SignUpPayload) => {
    const { error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          nom: payload.nom,
          prenom: payload.prenom,
          full_name: `${payload.prenom} ${payload.nom}`
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /* Déconnexion */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  /* Envoi d'un magic link (connexion sans mot de passe) */
  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /* Demande de réinitialisation du mot de passe */
  const resetPassword = useCallback(async (email: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?type=recovery`
        : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?type=recovery`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  /* Mise à jour du mot de passe (après callback) */
  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.access_token),
      isLoading,
      signIn,
      signUp,
      signOut,
      sendMagicLink,
      resetPassword,
      updatePassword
    }),
    [isLoading, resetPassword, sendMagicLink, session, signIn, signOut, signUp, updatePassword]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé dans AuthProvider.");
  }

  return context;
}
