"use client";

import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useOnPlay from "@/hooks/useOnPlay";
import { Song } from "@/types";
import { motion } from "framer-motion";
import { slideIn } from "@/variants";

interface SearchContentProps {
  songs: Song[];
}

const SearchContent: React.FC<SearchContentProps> = ({ songs }) => {
  const onPlay = useOnPlay(songs);
  if (songs.length === 0) {
    return (
      <div className="flex flex-col gap-y-2  w-full px-6 text-content-muted">
        No songs found.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-y-2 w-full px-6">
      {songs.map((song, index) => (
        <motion.div
          initial="hidden"
          animate="show"
          variants={slideIn("up", "", Math.min(index, 8) * 0.05, 0.25)}
          key={song.id}
          className="flex items-center gap-x-4 w-full"
        >
          <div className="flex-1">
            <MediaItem
              onClick={(id: number) => onPlay(id)}
              data={song}
              inPlayer={false}
              index={index}
            />
          </div>
          <LikeButton songId={song.id} />
        </motion.div>
      ))}
    </div>
  );
};

export default SearchContent;
