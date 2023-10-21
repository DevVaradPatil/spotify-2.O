"use client"

import useLoadImage from "@/hooks/useLoadImage";
import { Song } from "@/types"
import Image from "next/image";
import PlayButton from "./PlayButton";
import usePlayer from "@/hooks/usePlayer";
import { motion } from "framer-motion";
import { zoomIn } from '@/variants'

interface SongItemProps {
    data: Song;
    onClick: (id: string) => void
    index: number;
}

const SongItem: React.FC<SongItemProps> = ({
    data,
    onClick,
    index
}) => {
  const player = usePlayer();
    const imagePath = useLoadImage(data);
  return (
    <motion.div
    initial="hidden"
    animate="show"
    variants={zoomIn( index*0.25 , 0.25)}
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
      ${player.activeId === data.id && 'bg-neutral-500/40'}
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
        src={imagePath || '/images/music-placeholder.png'}
        fill
        alt="Image"
      />
    </div>
    <div className="flex flex-col items-start w-full pt-4 gap-y-1">
      <p className={`font-semibold truncate w-full ${player.activeId === data.id && 'text-green-500'}`}>
        {data.title}
      </p>
      <p 
        className="
          text-neutral-400 
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
  </motion.div>
  )
}

export default SongItem