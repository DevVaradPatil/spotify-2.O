import { Song } from "@/types";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const DEFAULT_LIMIT = 60;

const getSongs = async (limit: number = DEFAULT_LIMIT): Promise<Song[]> => {
  const supabase = createServerComponentClient({
    cookies: cookies,
  });

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.log(error);
  }

  return (data as any) || [];
};

export default getSongs;
