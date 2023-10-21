import getSongs from "@/actions/getSongs";
import Header from "@/components/Header";
import ListItem from "@/components/ListItem";
import PageContent from "./components/PageContent";
import PlaylistContent from "./components/PlaylistContent";
import getPlaylists from "@/actions/getPlaylists";

export const revalidate = 0;

export default async function Home() {
  const songs = await getSongs();
  const playlists = await getPlaylists();
  return (
   <div className="bg-neutral-900 rounded-b-lg md:rounded-lg  h-full w-full overflow-hidden overflow-y-auto">
      <Header>
        <div className="mb-2">
          <h1 className="text-white text-3xl font-semibold">
            Welcome back
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mt-4">
            <ListItem image="/images/liked.png" name="Liked Songs" href="/liked" />
            <ListItem image="/images/music.png" name="Your Library" href="/library" />
          </div>
        </div>
      </Header>
      <div className=" mt-2 mb-7 px-4 md:px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-2xl font-semibold">Newest songs</h1>
        </div>
        <PageContent songs={songs} />

      </div>
      <div className=" mt-2 mb-7 px-4 md:px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-2xl font-semibold">Your Playlists</h1>
        </div>
        <PlaylistContent playlists={playlists} />

      </div>
   </div>
  )
}
