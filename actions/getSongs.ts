import { Song } from "@/types";
import { createClient } from "@/libs/supabase/server";

const DEFAULT_LIMIT = 60;

const getSongs = async (limit: number = DEFAULT_LIMIT): Promise<Song[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.log(error);
  }

  return data ?? [];
};

export default getSongs;
