"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/libs/supabase/client";
import type { Database } from "@/types_db";

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseContextValue {
  supabaseClient: TypedSupabaseClient;
  session: Session | null;
  isLoading: boolean;
}

export const SupabaseContext = createContext<SupabaseContextValue | undefined>(
  undefined
);

interface SupabaseProviderProps {
  children: React.ReactNode;
}

/**
 * @supabase/ssr ships no React bindings, so this replaces
 * SessionContextProvider from @supabase/auth-helpers-react. It exposes the
 * same three things the old context did — client, session, isLoading — so
 * consumers only had to change an import.
 */
const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [supabaseClient] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const value = useMemo(
    () => ({ supabaseClient, session, isLoading }),
    [supabaseClient, session, isLoading]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
};

export default SupabaseProvider;
