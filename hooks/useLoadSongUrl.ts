import { Song } from "@/types";
import { useSupabaseClient } from "@/hooks/useSupabase";

/**
 * The parameter was typed `Song` while every call site passed `song!` on a
 * possibly-undefined value, so the null check below was unreachable as far as
 * the compiler was concerned. Now the signature says what actually happens.
 */
const useLoadSongUrl = (song: Song | null) => {
  const supabaseClient = useSupabaseClient();

  if (!song?.song_path) {
    return "";
  }

  const { data: songData } = supabaseClient.storage
    .from("songs")
    .getPublicUrl(song.song_path);

  return songData.publicUrl;
};

export default useLoadSongUrl;
