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

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!user) {
      setUserDetails(null);
      setSubscription(null);
      return;
    }

    let cancelled = false;
    setIsLoadingData(true);

    // maybeSingle() rather than single(): a user with no profile row or no
    // active subscription is an ordinary state, not an error.
    Promise.allSettled([
      supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("*, prices(*, products(*))")
        .in("status", ["trialing", "active"])
        .maybeSingle(),
    ]).then((results) => {
      if (cancelled) return;

      const [detailsResult, subscriptionResult] = results;

      if (detailsResult.status === "fulfilled") {
        setUserDetails((detailsResult.value.data as UserDetails) ?? null);
      }
      if (subscriptionResult.status === "fulfilled") {
        setSubscription((subscriptionResult.value.data as Subscription) ?? null);
      }
      setIsLoadingData(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

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
