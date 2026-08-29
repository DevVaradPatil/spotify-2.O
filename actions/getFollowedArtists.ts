import { Artist } from "@/types";
import { createClient } from "@/libs/supabase/server";
import { logger } from "@/libs/logger";

/** Artists the signed-in user follows, most recently followed first. */
const getFollowedArtists = async (limit = 12): Promise<Artist[]> => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("created_at, artists(*)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error(error.message, { scope: "getFollowedArtists" });
    return [];
  }

  return (data ?? [])
    .map((row) => row.artists as unknown as Artist | null)
    .filter((artist): artist is Artist => artist !== null);
};

export default getFollowedArtists;
