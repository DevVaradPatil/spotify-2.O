import Header from "@/components/Header";
import Image from "next/image";
import LibraryContent from "./components/LibraryContent";
import getSongsByUserId from "@/actions/getSongsByUserId";

export const revalidate = 0;
const Library = async () => {
    const songs = await getSongsByUserId();
  return (
    <div className=" bg-neutral-900 rounded-lg h-full w-full overflow-hidden overflow-y-auto">
        <Header >
            <div className="mt-20">
                <div className="flex flex-col md:flex-row items-center gap-x-5">
                    <div className="relative h-32 w-32 lg:h-44 lg:w-44 rounded-md bg-gradient-to-br from-pink-700 to-neutral-200 overflow-hidden">
                        <Image fill src="/images/music.png" alt="Playlist" className="object-cover" />
                    </div>
                    <div className="flex flex-col gap-y-2 mt-4 md:mt-0">
                        <p className="hidden md:block font-semibold text-md">Playlist</p>
                        <h1 className="text-white text-4xl sm:text-5xl lg:text-7xl font-bold">Your Library</h1>
                    </div>
                </div>
            </div>
        </Header>
        <LibraryContent songs={songs} />
    </div>
  )
}

export default Library;