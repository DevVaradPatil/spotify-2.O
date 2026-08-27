"use client";
import React from "react";
import PlaylistItem from "@/components/PlaylistItem";
import { Playlist } from "@/types";
import Link from "next/link";

interface PlaylistContentProps {
  playlists: Playlist[];
}

// getPlaylists() now filters by the signed-in user server-side, so the
// client-side ownership filter that used to live here is gone. It was never
// a security boundary anyway — the rows had already been sent to the browser.
const PlaylistContent: React.FC<PlaylistContentProps> = ({ playlists }) => {
  if (playlists.length === 0) {
    return <div className="mt-4 text-neutral-300">No playlists available</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-4">
      {playlists.slice(0, 6).map((item, index) => (
        <Link href={`/playlist/${item.id}`} key={item.id}>
          <PlaylistItem data={item} index={index} />
        </Link>
      ))}
    </div>
  );
};

export default PlaylistContent;
