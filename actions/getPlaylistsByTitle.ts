import { Playlist } from "@/types";
import { createClient } from "@/libs/supabase/server";
import getPlaylists from "./getPlaylists";

const getPlaylistsByTitle = async (title: string): Promise<Playlist[]> => {
  const supabase = await createClient();

  if (!title) {
    const allPlaylists = await getPlaylists();
    return allPlaylists;
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .ilike("name", `%${title}%`)
    .order("created_at", { ascending: false });
  if (error) {
    console.log(error);
  }

  return data ?? [];
};

export default getPlaylistsByTitle;
