import { Song } from "@/types";
import { createClient } from "@/libs/supabase/server";

/**
 * Reads playlist membership from the playlist_songs join table.
 *
 * Previously took the `song_ids` int8[] and did `.in('id', ids)`, which lost
 * the playlist's ordering — `.in()` returns rows in whatever order Postgres
 * likes — and could not express position at all.
 */
const getPlaylistSongs = async (playlistId: number): Promise<Song[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playlist_songs")
    .select("position, songs(*)")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (error) {
    console.error("[getPlaylistSongs]", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.songs as unknown as Song | null)
    .filter((song): song is Song => song !== null);
};

export default getPlaylistSongs;
