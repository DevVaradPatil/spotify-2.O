"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import toast from "react-hot-toast";
import { useUser } from "./useUser";

interface LikedSongsContextValue {
  likedIds: Set<string>;
  isLiked: (songId: string) => boolean;
  toggleLike: (songId: string) => Promise<void>;
  isLoading: boolean;
}

const LikedSongsContext = createContext<LikedSongsContextValue | undefined>(undefined);

/**
 * One query for the whole page instead of one per row.
 *
 * LikeButton used to run its own `liked_songs` select on mount, so a list of
 * 50 songs fired 50 requests. The set of liked ids is fetched once here and
 * every button reads from it.
 */
export const LikedSongsProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLikedIds(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("liked_songs")
        .select("song_id")
        .eq("user_id", user.id);

      if (!cancelled) {
        if (!error && data) {
          setLikedIds(new Set(data.map((row) => String(row.song_id))));
        }
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  const isLiked = useCallback(
    (songId: string) => likedIds.has(String(songId)),
    [likedIds]
  );

  const toggleLike = useCallback(
    async (songId: string) => {
      if (!user?.id) return;
      const key = String(songId);
      const currentlyLiked = likedIds.has(key);

      // Optimistic, reverted if the write fails.
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.delete(key);
        else next.add(key);
        return next;
      });

      const { error } = currentlyLiked
        ? await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", user.id)
            .eq("song_id", songId)
        : await supabase
            .from("liked_songs")
            .insert({ song_id: songId, user_id: user.id });

      if (error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (currentlyLiked) next.add(key);
          else next.delete(key);
          return next;
        });
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
