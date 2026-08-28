"use client";

import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useOnPlay from "@/hooks/useOnPlay";
import { Song } from "@/types";

interface ArtistContentProps {
  songs: Song[];
}

const ArtistContent: React.FC<ArtistContentProps> = ({ songs }) => {
  const onPlay = useOnPlay(songs);

  if (songs.length === 0) {
    return (
      <div className="flex flex-col gap-y-2 w-full px-6 text-content-muted">
        No songs from this artist yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2 w-full p-6">
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

export default ArtistContent;
