import { Song } from "@/types";
import { createPublicClient } from "@/libs/supabase/public";
import getSongs from "./getSongs";

const DEFAULT_LIMIT = 60;

/**
 * Not cached: the result varies per query string, and caching a distinct entry
 * per search term would fill the cache with single-use values. The empty-query
 * case delegates to the cached catalog listing.
 */
const getSongsByTitle = async (
  title: string,
  limit: number = DEFAULT_LIMIT
): Promise<Song[]> => {
  if (!title) {
    return getSongs(limit);
  }

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .ilike("title", `%${title}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getSongsByTitle]", error.message);
    return [];
  }

  return data ?? [];
};

export default getSongsByTitle;
