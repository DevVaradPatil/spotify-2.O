import { Artist, Song } from "@/types";
import { createClient } from "@/libs/supabase/server";

export interface ArtistPage {
  artist: Artist;
  songs: Song[];
  followerCount: number;
  isFollowing: boolean;
}

/**
 * An artist, their catalog, and the viewer's relationship to them.
 *
 * Follower count is read with `head: true` so Postgres returns the count
 * without shipping the rows.
 */
const getArtist = async (slug: string): Promise<ArtistPage | null> => {
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!artist) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [{ data: songs }, { count }, { data: follow }] = await Promise.all([
    supabase
      .from("songs")
      .select("*")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artist.id),
    session?.user
      ? supabase
          .from("follows")
          .select("artist_id")
          .eq("artist_id", artist.id)
          .eq("user_id", session.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    artist,
    songs: songs ?? [],
    followerCount: count ?? 0,
    isFollowing: Boolean(follow),
  };
};

export default getArtist;
