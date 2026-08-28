import Image from "next/image";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import { createClient } from "@/libs/supabase/server";
import getPlaylistSongs from "@/actions/getPlaylistSongs";
import PlaylistContent from "./components/PlaylistContent";

// Per-user data — owner-scoped by RLS, so this must not be cached across visitors.
export const revalidate = 0;

interface PlaylistPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Converted from a client component that fetched the playlist in an effect,
 * then redirected if the viewer did not own it — meaning the row had already
 * been sent to the browser before the check ran.
 *
 * Ownership is now enforced twice over: the RLS policy on `playlists` returns
 * nothing for a row the caller does not own, and this renders notFound() for
 * anything that comes back empty. Nothing about a private playlist reaches the
 * client.
 */
const PlaylistPage = async ({ params }: PlaylistPageProps) => {
  const { id } = await params;
  const playlistId = Number(id);

  if (!Number.isInteger(playlistId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .maybeSingle();

  if (!playlist) {
    notFound();
  }

  const songs = await getPlaylistSongs(playlist.id);

  const imageUrl = playlist.image_path
    ? supabase.storage.from("images").getPublicUrl(playlist.image_path).data.publicUrl
    : "/images/playlist.png";

  return (
    <div className="bg-surface rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header>
        <div className="mt-20">
          <div className="flex flex-col md:flex-row items-center gap-x-5">
            <div className="relative h-32 w-32 lg:h-44 lg:w-44 rounded-md overflow-hidden">
              <Image
                fill
                src={imageUrl}
                alt={`Cover art for ${playlist.name}`}
                sizes="(max-width: 1024px) 8rem, 11rem"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-y-2 mt-4 md:mt-0">
              <p className="hidden md:block font-semibold text-md">Playlist</p>
              <h1 className="text-white text-center md:text-left text-4xl sm:text-5xl lg:text-7xl font-bold">
                {playlist.name}
              </h1>
              <p className="text-neutral-300 w-full text-center md:text-left text-regular">
                {playlist.desc}
              </p>
            </div>
          </div>
        </div>
      </Header>

      <PlaylistContent songs={songs} />
    </div>
  );
};

export default PlaylistPage;
