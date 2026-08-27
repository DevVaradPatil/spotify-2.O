import { Playlist } from "@/types";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Returns only the signed-in user's playlists.
 *
 * This previously selected every playlist in the table with no user filter
 * and left the ownership check to a client-side .filter() in
 * PlaylistContent, which meant every visitor received every other user's
 * playlist rows.
 */
const getPlaylists = async (): Promise<Playlist[]> => {
  const supabase = createServerComponentClient({
    cookies: cookies,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPlaylists]', error.message);
    return [];
  }

  return (data as Playlist[]) || [];
};

export default getPlaylists;
