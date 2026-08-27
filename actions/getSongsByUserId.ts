import { Song } from "@/types";
import { createClient } from "@/libs/supabase/server";

const getSongsByUserId = async (): Promise<Song[]> => {
  const supabase = await createClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[getSongsByUserId]", sessionError.message);
    return [];
  }

  // Without this guard the user id is `undefined` when there is no session,
  // which Postgres rejects with `invalid input syntax for type uuid`.
  if (!sessionData.session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", sessionData.session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getSongsByUserId]", error.message);
    return [];
  }

  return (data as Song[]) || [];
};

export default getSongsByUserId;
