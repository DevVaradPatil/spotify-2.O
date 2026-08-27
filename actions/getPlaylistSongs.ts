import { Song } from "@/types";
import { createClient } from "@/libs/supabase/server";

const getPlaylistSongs = async (songIds: number[]): Promise<Song[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("songs").select("*").in("id", songIds);

  if (error) {
    console.log(error);
    return [];
  }

  return data as Song[];
};

export default getPlaylistSongs;
