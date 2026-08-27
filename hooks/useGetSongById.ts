import { Song } from "@/types";
import { useSessionContext } from "@/hooks/useSupabase";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const useGetSongById = (id?: number) => {
  const [loaded, setLoaded] = useState<{ id?: number; song?: Song }>({});
  const { supabaseClient } = useSessionContext();

  // Derived rather than stored: no setState in the effect body just to flip a
  // loading flag on.
  const isLoading = id !== undefined && loaded.id !== id;

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const fetchSong = async () => {
      const { data, error } = await supabaseClient
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error) {
        toast.error(error.message);
        setLoaded({ id, song: undefined });
        return;
      }

      setLoaded({ id, song: data as Song });
    };

    fetchSong();

    return () => {
      cancelled = true;
    };
  }, [id, supabaseClient]);

  return useMemo(
    () => ({ isLoading, song: loaded.id === id ? loaded.song : undefined }),
    [isLoading, loaded, id]
  );
};

export default useGetSongById;
