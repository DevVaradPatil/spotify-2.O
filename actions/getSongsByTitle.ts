import { Song } from "@/types";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import getSongs from "./getSongs";

const DEFAULT_LIMIT = 60;

const getSongsByTitle = async (
  title: string,
  limit: number = DEFAULT_LIMIT
): Promise<Song[]> => {
  const supabase = createServerComponentClient({
    cookies: cookies,
  });

  if (!title) {
    const allSongs = await getSongs(limit);
    return allSongs;
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .ilike("title", `%${title}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.log(error);
  }

  return (data as any) || [];
};

export default getSongsByTitle;
