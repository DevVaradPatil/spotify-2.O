"use client";

import useLoadImage from "@/hooks/useLoadImage";
import { Song } from "@/types";
import Image from "next/image";
import PlayButton from "./PlayButton";
import usePlayer from "@/hooks/usePlayer";
import { motion } from "framer-motion";
import { zoomIn } from "@/variants";

interface SongItemProps {
  data: Song;
  onClick: (id: number) => void;
  index: number;
}

const SongItem: React.FC<SongItemProps> = ({ data, onClick, index }) => {
  const activeId = usePlayer((state) => state.activeId);
  const imagePath = useLoadImage(data);
  return (
    <motion.button
      type="button"
      aria-label={`Play ${data.title} by ${data.author}`}
      initial="hidden"
      animate="show"
      variants={zoomIn(Math.min(index, 8) * 0.05, 0.25)}
      onClick={() => onClick(data.id)}
      className={`
      relative 
      group 
      flex 
      flex-col 
      items-center 
      justify-center 
      rounded-md 
      overflow-hidden 
      gap-x-4 
      bg-neutral-400/5 
      cursor-pointer 
      hover:bg-neutral-400/10 
      transition 
      p-3
      text-left
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface
      ${activeId === data.id && "bg-neutral-500/40"}
    `}
    >
      <div
        className="
        relative 
        aspect-square 
        w-full
        h-full 
        rounded-md 
        overflow-hidden
      "
      >
        <Image
          className="object-cover"
          src={imagePath || "/images/music.png"}
          fill
          sizes={
            "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
          }
          alt=""
        />
      </div>
      <div className="flex flex-col items-start w-full pt-4 gap-y-1">
        <p
          className={`font-semibold truncate w-full ${activeId === data.id && "text-accent"}`}
        >
          {data.title}
        </p>
        <p
          className="
          text-content-muted 
          text-sm 
          pb-4 
          w-full 
          truncate
        "
        >
          By {data.author}
        </p>
      </div>
      <div className="absolute bottom-24 right-5">
        <PlayButton />
      </div>
    </motion.button>
  );
};

export default SongItem;
