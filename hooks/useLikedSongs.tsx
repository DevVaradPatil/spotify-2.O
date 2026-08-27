"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSupabaseClient } from "@/hooks/useSupabase";
import toast from "react-hot-toast";
import { useUser } from "./useUser";

interface LikedSongsContextValue {
  likedIds: ReadonlySet<number>;
  isLiked: (songId: number) => boolean;
  toggleLike: (songId: number) => Promise<void>;
  isLoading: boolean;
}

const EMPTY: ReadonlySet<number> = new Set<number>();

const LikedSongsContext = createContext<LikedSongsContextValue | undefined>(undefined);

interface LoadedState {
  userId?: string;
  ids: Set<number>;
}

/**
 * One query for the whole page instead of one per row.
 *
 * LikeButton used to run its own `liked_songs` select on mount, so a list of
 * 50 songs fired 50 requests. The set of liked ids is fetched once here and
 * every button reads from it.
 *
 * State is keyed by user id so both `likedIds` and `isLoading` are derived
 * during render — signing in or out needs no setState in an effect body.
 */
export const LikedSongsProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [loaded, setLoaded] = useState<LoadedState>({ ids: new Set() });

  const isCurrent = !!user?.id && loaded.userId === user.id;
  const likedIds = isCurrent ? loaded.ids : EMPTY;
  const isLoading = !!user?.id && !isCurrent;

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("liked_songs")
        .select("song_id")
        .eq("user_id", userId);

      if (cancelled) return;

      setLoaded({
        userId,
        ids: new Set(error || !data ? [] : data.map((row) => row.song_id)),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  const isLiked = useCallback((songId: number) => likedIds.has(songId), [likedIds]);

  const toggleLike = useCallback(
    async (songId: number) => {
      const userId = user?.id;
      if (!userId) return;

      const currentlyLiked = likedIds.has(songId);

      // Optimistic, reverted if the write fails.
      const applyLocal = (liked: boolean) =>
        setLoaded((prev) => {
          const ids = new Set(prev.ids);
          if (liked) ids.add(songId);
          else ids.delete(songId);
          return { userId, ids };
        });

      applyLocal(!currentlyLiked);

      const { error } = currentlyLiked
        ? await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", userId)
            .eq("song_id", songId)
        : await supabase
            .from("liked_songs")
            .insert({ song_id: songId, user_id: userId });

      if (error) {
        applyLocal(currentlyLiked);
        toast.error(error.message);
        return;
      }

      if (!currentlyLiked) toast.success("Added to Liked Songs!");
    },
    [likedIds, user?.id, supabase]
  );

  const value = useMemo(
    () => ({ likedIds, isLiked, toggleLike, isLoading }),
    [likedIds, isLiked, toggleLike, isLoading]
  );

  return (
    <LikedSongsContext.Provider value={value}>{children}</LikedSongsContext.Provider>
  );
};

export const useLikedSongs = () => {
  const context = useContext(LikedSongsContext);
  if (context === undefined) {
    throw new Error("useLikedSongs must be used within a LikedSongsProvider.");
  }
  return context;
};
