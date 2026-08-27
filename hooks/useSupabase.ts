"use client";

import { useContext } from "react";

import {
  SupabaseContext,
  type SupabaseContextValue,
  type TypedSupabaseClient,
} from "@/providers/SupabaseProvider";

/**
 * Drop-in replacements for the hooks @supabase/auth-helpers-react used to
 * provide. Same names and shapes, so migrating the call sites was an import
 * change rather than a rewrite.
 */
export const useSessionContext = (): SupabaseContextValue => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SupabaseProvider.");
  }
  return context;
};

export const useSupabaseClient = (): TypedSupabaseClient =>
  useSessionContext().supabaseClient;

export const useSession = () => useSessionContext().session;

export const useSupabaseUser = () => useSessionContext().session?.user ?? null;
