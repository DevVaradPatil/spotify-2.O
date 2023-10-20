import PlaylistItem from "@/components/PlaylistItem";
import { Playlist } from "@/types";
import Link from "next/link";
import React from "react";

interface PlaylistContentProps {
  playlists: Playlist[];
}

const PlaylistContent: React.FC<PlaylistContentProps> = ({ playlists }) => {
  if (playlists.length === 0) {
    return <div className="mt-4 text-neutral-400">No playlists Available</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-4">
      {playlists.map((item) => (
        <Link href={`/playlist/${item.id}`} key={item.id}>
          <PlaylistItem data={item} />
        </Link>
      ))}
    </div>
  );
};

export default PlaylistContent;
