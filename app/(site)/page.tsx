import getSongs from "@/actions/getSongs";
import Header from "@/components/Header";
import ListItem from "@/components/ListItem";
import PageContent from "./components/PageContent";
import PlaylistContent from "./components/PlaylistContent";
import getPlaylists from "@/actions/getPlaylists";
import RandomButton from "@/components/RandomButton";
import getRecentlyPlayed from "@/actions/getRecentlyPlayed";
import getFollowedArtists from "@/actions/getFollowedArtists";
import ArtistRow from "./components/ArtistRow";

export default async function Home() {
  // Run in parallel: these were sequential awaits, so the page waited for the
  // sum of every query rather than the slowest one.
  const [songs, playlists, recentlyPlayed, followedArtists] = await Promise.all([
    getSongs(),
    getPlaylists(),
    getRecentlyPlayed(),
    getFollowedArtists(),
  ]);
  return (
    <div className="bg-surface rounded-b-lg md:rounded-lg  h-full w-full overflow-hidden overflow-y-auto">
      <Header>
        <div className="mb-2">
          <h1 className="text-white text-3xl font-semibold">Welcome back</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mt-4">
            <ListItem
              image="/images/liked.png"
              name="Liked Songs"
              href="/liked"
              index={0}
            />
            <ListItem
              image="/images/music.png"
              name="Your Library"
              href="/library"
              index={1}
            />
            <RandomButton songs={songs} />
          </div>
        </div>
      </Header>
      {recentlyPlayed.length > 0 && (
        <section className=" mt-2 mb-7 px-4 md:px-6">
          <h2 className="text-white text-2xl font-semibold">Recently played</h2>
          <PageContent songs={recentlyPlayed} />
        </section>
      )}
      <section className=" mt-2 mb-7 px-4 md:px-6">
        <h2 className="text-white text-2xl font-semibold">Newest songs</h2>
        <PageContent songs={songs} />
      </section>
      {followedArtists.length > 0 && (
        <section className=" mt-2 mb-7 px-4 md:px-6">
          <h2 className="text-white text-2xl font-semibold">Artists you follow</h2>
          <ArtistRow artists={followedArtists} />
        </section>
      )}
      <section className=" mt-2 mb-7 px-4 md:px-6">
        <h2 className="text-white text-2xl font-semibold">Your Playlists</h2>
        <PlaylistContent playlists={playlists} />
      </section>
    </div>
  );
}
