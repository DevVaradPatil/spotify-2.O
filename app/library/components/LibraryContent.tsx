"use client";

import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useOnPlay from "@/hooks/useOnPlay";
import { useUser } from "@/hooks/useUser";
import { Song } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaPlay } from "react-icons/fa";

interface LibraryContentProps {
  songs: Song[];
}

const LibraryContent: React.FC<LibraryContentProps> = ({ songs }) => {
  const router = useRouter();
  const { isLoading, user } = useUser();
  const onPlay = useOnPlay(songs);
  const handlePlaylist = () => {
    onPlay(songs[0].id);
  };
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (songs.length === 0) {
    return (
      <div className="flex flex-col gap-y-2 w-full px-6 text-neutral-400">
        You haven&apos;t uploaded any songs yet.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-y-2 w-full p-6">
      <div className="px-3 md:px-6 py-3 flex w-full justify-start items-center">
        <button
          onClick={handlePlaylist}
          aria-label="Play all songs"
          className="rounded-full flex items-center cursor-pointer bg-green-500 p-4 shadow-lg transition hover:bg-green-600 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <FaPlay className="text-black" aria-hidden="true" />
        </button>
        <p className="ml-3 text-lg font-semibold">Listen to this playlist</p>
      </div>
      {songs.map((song, index) => (
        <div key={song.id} className="flex items-center gap-x-4 w-full">
          <div className="flex-1">
            <MediaItem
              onClick={(id: number) => onPlay(id)}
              data={song}
              inPlayer={false}
              index={index}
            />
          </div>
          <LikeButton songId={song.id} />
        </div>
      ))}
    </div>
  );
};

export default LibraryContent;
