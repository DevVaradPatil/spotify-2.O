import { notFound } from "next/navigation";

import Header from "@/components/Header";
import FollowButton from "@/components/FollowButton";
import getArtist from "@/actions/getArtist";
import ArtistContent from "./components/ArtistContent";

// Per-user data — the follow state is the viewer's, so this must not be
// cached across visitors.
export const revalidate = 0;

interface ArtistPageProps {
  params: Promise<{ slug: string }>;
}

const ArtistPage = async ({ params }: ArtistPageProps) => {
  const { slug } = await params;
  const result = await getArtist(slug);

  if (!result) {
    notFound();
  }

  const { artist, songs, followerCount, isFollowing } = result;

  return (
    <div className="bg-surface rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header>
        <div className="mt-20">
          <div className="flex flex-col md:flex-row items-center gap-x-5">
            <div
              className="relative flex h-32 w-32 lg:h-44 lg:w-44 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-500 text-5xl font-bold text-black"
              aria-hidden="true"
            >
              {artist.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-y-3 mt-4 md:mt-0">
              <p className="hidden md:block font-semibold text-md">Artist</p>
              <h1 className="text-white text-center md:text-left text-4xl sm:text-5xl lg:text-7xl font-bold">
                {artist.name}
              </h1>
              <p className="text-content-muted text-center md:text-left">
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </p>
              <FollowButton
                artistId={artist.id}
                artistName={artist.name}
                initialIsFollowing={isFollowing}
                initialFollowerCount={followerCount}
              />
            </div>
          </div>
        </div>
      </Header>

      <ArtistContent songs={songs} />
    </div>
  );
};

export default ArtistPage;
