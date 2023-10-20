import { Song } from '@/types';
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const getPlaylistSongs = async (songIds: string[]): Promise<Song[]> => {
  const supabase = createServerComponentClient({
    cookies: cookies
  });

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .in('id', songIds);

  if (error) {
    console.log(error);
    return [];
  }

  return data as Song[];
};

export default getPlaylistSongs;
