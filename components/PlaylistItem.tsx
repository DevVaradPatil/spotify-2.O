"use client";

import useLoadImage from "@/hooks/useLoadImage";
import { Playlist } from "@/types";
import Image from "next/image";
import PlayButton from "./PlayButton";
import { useUser } from "@/hooks/useUser";

interface PlaylistItemProps {
  data: Playlist;
}


const PlaylistItem: React.FC<PlaylistItemProps> = ({ data }) => {
  const { user } = useUser();
  const imagePath = useLoadImage(data);
  if(data.user_id === user?.id){
    return null;
  }
  return (
    <div
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
    </div>
  );
};

export default PlaylistItem;
