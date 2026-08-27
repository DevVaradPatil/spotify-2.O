"use client";

import useLoadImage from "@/hooks/useLoadImage";
import usePlayer from "@/hooks/usePlayer";
import { Song } from "@/types";
import Image from "next/image";
import { motion } from "framer-motion";
import { slideIn } from "@/variants";

interface MediaItemProps {
  data: Song;
  onClick?: (id: number) => void;
  inPlayer?: boolean;
  index: number;
  isLeft?: boolean;
}

const MediaItem: React.FC<MediaItemProps> = ({
  data,
  onClick,
  inPlayer,
  index,
  isLeft,
}) => {
  const activeId = usePlayer((state) => state.activeId);
  const setId = usePlayer((state) => state.setId);
  const imageUrl = useLoadImage(data);

  const handleClick = () => {
    if (onClick) {
      return onClick(data.id);
    }
    return setId(data.id);
  };
  return (
    <motion.button
      type="button"
      aria-label={`Play ${data.title} by ${data.author}`}
      initial="hidden"
      animate="show"
      variants={slideIn(
        `${isLeft ? "left" : "up"}`,
        " ",
        Math.min(index, 8) * 0.05,
        0.25
      )}
      onClick={handleClick}
      className={`flex items-center gap-x-3 cursor-pointer hover:bg-surface-raised/50 w-full p-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeId === data.id && !inPlayer && "bg-surface-raised"}`}
    >
      <div className="relative rounded-md min-h-[48px] min-w-[48px] overflow-hidden">
        <Image
          fill
          sizes="48px"
          src={imageUrl || "/images/liked.png"}
          alt=""
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-y-1 overflow-hidden">
        <p
          className={`truncate ${activeId === data.id && !inPlayer ? "text-accent font-semibold" : "text-white"}`}
        >
          {data.title}
        </p>
        <p className="text-content-muted text-sm truncate">{data.author}</p>
      </div>
    </motion.button>
  );
};

export default MediaItem;
