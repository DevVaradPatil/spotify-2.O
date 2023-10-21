"use client";

import useLoadImage from "@/hooks/useLoadImage";
import { Playlist } from "@/types";
import Image from "next/image";
import PlayButton from "./PlayButton";
import { useUser } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { zoomIn } from '@/variants'


interface PlaylistItemProps {
  data: Playlist;
  index: number;
}


const PlaylistItem: React.FC<PlaylistItemProps> = ({ data, index }) => {
  const { user } = useUser();
  const imagePath = useLoadImage(data);
  if(!user){
    return null;
  }
  if(data.user_id === user?.id){
    return null;
  }
  return (
    <motion.div
    initial="hidden"
    animate="show"
    variants={zoomIn( index*0.25 , 0.25)}
      className="
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
    "
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
          src={imagePath || "/images/music-placeholder.png"}
          fill
          alt="Image"
        />
      </div>
      <div className="flex flex-col items-start w-full pt-4 gap-y-1">
        <p className="font-semibold truncate w-full">{data.name}</p>
        <p
          className="
          text-neutral-400 
          text-sm 
          pb-4 
          w-full 
          truncate
        "
        >
          {data.desc}
        </p>
      </div>
      <div className="absolute bottom-24 right-5">
        <PlayButton/>
      </div>
    </motion.div>
  );
};

export default PlaylistItem;
