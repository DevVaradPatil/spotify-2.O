"use client";

import { useEffect, useState, createContext, useContext, useMemo } from "react";
import type { User } from "@supabase/supabase-js";

import { useSessionContext } from "./useSupabase";
import { UserDetails, Subscription } from "@/types";

type UserContextType = {
  accessToken: string | null;
  user: User | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export interface Props {
  [propName: string]: any;
}

export const MyUserContextProvider = (props: Props) => {
  const {
    session,
    isLoading: isLoadingUser,
    supabaseClient: supabase,
  } = useSessionContext();

  const user = session?.user ?? null;
  const accessToken = session?.access_token ?? null;

  const [loaded, setLoaded] = useState<{
    userId?: string;
    details: UserDetails | null;
    subscription: Subscription | null;
  }>({ details: null, subscription: null });

  // All three are derived from whether the loaded data belongs to the current
  // user, so neither signing out nor starting a fetch needs a synchronous
  // setState inside the effect body.
  const isCurrent = !!user && loaded.userId === user.id;
  const userDetails = isCurrent ? loaded.details : null;
  const subscription = isCurrent ? loaded.subscription : null;
  const isLoadingData = !!user && !isCurrent;

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    // maybeSingle() rather than single(): a user with no profile row or no
    // active subscription is an ordinary state, not an error.
    Promise.allSettled([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("*, prices(*, products(*))")
        .in("status", ["trialing", "active"])
        .maybeSingle(),
    ]).then((results) => {
      if (cancelled) return;

      const [detailsResult, subscriptionResult] = results;

      setLoaded({
        userId,
        details:
          detailsResult.status === "fulfilled"
            ? ((detailsResult.value.data as UserDetails) ?? null)
            : null,
        subscription:
          subscriptionResult.status === "fulfilled"
            ? ((subscriptionResult.value.data as Subscription) ?? null)
            : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      userDetails,
      isLoading: isLoadingUser || isLoadingData,
      subscription,
    }),
    [accessToken, user, userDetails, isLoadingUser, isLoadingData, subscription]
  );

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error(`useUser must be used within a MyUserContextProvider.`);
  }
  return context;
};
