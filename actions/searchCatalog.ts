import { Artist, Song } from "@/types";
import { createPublicClient } from "@/libs/supabase/public";
import getSongs from "./getSongs";

const DEFAULT_LIMIT = 60;

export interface CatalogResults {
  songs: Song[];
  artists: Artist[];
}

const OR_FILTER_SYNTAX = /[,()\\]/g;

/**
 * PostgREST's `or()` takes a comma-separated filter list, so a query
 * containing a comma or a parenthesis would otherwise break out of the filter
 * it is embedded in. Stripping those characters is not cosmetic — it is what
 * stops a search term from being read as filter syntax.
 */
export const sanitizeForOrFilter = (query: string) =>
  query.replace(OR_FILTER_SYNTAX, " ").trim();

/**
 * Searches songs by title *or* author, and artists by name.
 *
 * Previously title-only, which meant searching for a performer whose name is
 * printed under every one of their tracks returned nothing.
 *
 * Not cached: results vary per query string, so caching would fill the store
 * with single-use entries. The empty-query case delegates to the cached
 * catalog listing.
 */
const searchCatalog = async (
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<CatalogResults> => {
  const trimmed = sanitizeForOrFilter(query ?? "");

  if (!trimmed) {
    return { songs: await getSongs(limit), artists: [] };
  }

  const supabase = createPublicClient();
  const pattern = `%${trimmed}%`;

  const [songsResult, artistsResult] = await Promise.all([
    supabase
      .from("songs")
      .select("*")
      .or(`title.ilike.${pattern},author.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("artists")
      .select("*")
      .ilike("name", pattern)
      .order("name", { ascending: true })
      .limit(12),
  ]);

  if (songsResult.error) {
    console.error("[searchCatalog] songs", songsResult.error.message);
  }
  // The artists table does not exist until migration 8 is applied; an empty
  // list is the right degradation rather than a broken search page.
  if (artistsResult.error) {
    console.error("[searchCatalog] artists", artistsResult.error.message);
  }

  return {
    songs: songsResult.data ?? [],
    artists: artistsResult.data ?? [],
  };
};

export default searchCatalog;
