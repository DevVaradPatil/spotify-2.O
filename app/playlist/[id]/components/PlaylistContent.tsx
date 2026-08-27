"use client";
import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useOnPlay from "@/hooks/useOnPlay";
import { Song } from "@/types";
import React from "react";
import { FaPlay } from "react-icons/fa";

interface PlaylistContentProps {
  songs: Song[];
}

const PlaylistContent: React.FC<PlaylistContentProps> = ({ songs }) => {
  const onPlay = useOnPlay(songs);
  const handlePlaylist = () => {
    onPlay(songs[0].id);
  };

  return (
    <>
      <div className="px-3 md:px-6 py-3 flex w-full justify-start items-center">
        <button
          onClick={handlePlaylist}
          aria-label="Play all songs"
          className="rounded-full flex items-center cursor-pointer bg-accent p-4 shadow-lg transition hover:bg-accent-hover hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <FaPlay className="text-black" aria-hidden="true" />
        </button>
        <p className="ml-3 text-lg font-semibold">Listen to this playlist</p>
      </div>
      <div className="px-6">
        {songs.length === 0 ? (
          <p className="flex flex-col gap-y-2 w-full px-3 md:px-6 text-content-muted">
            No songs in playlist
          </p>
        ) : (
          songs.map((song, index) => (
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
          ))
        )}
      </div>
    </>
  );
};

export default PlaylistContent;
