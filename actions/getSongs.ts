import { unstable_cache } from "next/cache";

import { Song } from "@/types";
import { createPublicClient } from "@/libs/supabase/public";
import { CACHE_TAGS, CACHE_TTL_SECONDS } from "@/libs/cacheTags";

const DEFAULT_LIMIT = 60;

/**
 * The song catalog is public and identical for every visitor, so it is cached
 * across requests and tagged rather than re-queried on every navigation.
 *
 * Uses the cookie-free client on purpose: reading cookies would mark the
 * request dynamic and defeat the cache entirely.
 *
 * Invalidated by the createSong Server Action after an upload.
 */
const getSongs = unstable_cache(
  async (limit: number = DEFAULT_LIMIT): Promise<Song[]> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getSongs]", error.message);
      return [];
    }

    return data ?? [];
  },
  ["songs-list"],
  { tags: [CACHE_TAGS.songs], revalidate: CACHE_TTL_SECONDS }
);

export default getSongs;
