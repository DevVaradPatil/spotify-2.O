import { Song } from "@/types";
import { createClient } from "@/libs/supabase/server";
import { logger } from "@/libs/logger";

/**
 * The signed-in user's recently played tracks, most recent first, with
 * repeats collapsed to their latest play.
 *
 * De-duplication happens here rather than in SQL because PostgREST cannot
 * express `distinct on`. Over-fetching a bounded window and reducing it is
 * cheaper than adding a database function for a list this small.
 */
const getRecentlyPlayed = async (limit = 8): Promise<Song[]> => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("play_events")
    .select("song_id, played_at, songs(*)")
    .eq("user_id", session.user.id)
    .order("played_at", { ascending: false })
    .limit(limit * 6);

  if (error) {
    logger.error(error.message, { scope: "getRecentlyPlayed" });
    return [];
  }

  const seen = new Set<number>();
  const songs: Song[] = [];

  for (const row of data ?? []) {
    if (seen.has(row.song_id)) continue;
    seen.add(row.song_id);

    const song = row.songs as unknown as Song | null;
    // A song deleted since it was played leaves the event but no join row.
    if (song) songs.push(song);
    if (songs.length >= limit) break;
  }

  return songs;
};

export default getRecentlyPlayed;
