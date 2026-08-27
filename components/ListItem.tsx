"use client";
import useAuthModal from "@/hooks/useAuthModel";
import { useUser } from "@/hooks/useUser";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { FaPlay } from "react-icons/fa";
import { motion } from "framer-motion";
import { slideIn } from "@/variants";

interface ListItemProps {
  image: string;
  name: string;
  href: string;
  index: number;
}

const ListItem: React.FC<ListItemProps> = ({ image, name, href, index }) => {
  const router = useRouter();
  const { user } = useUser();
  const authModal = useAuthModal();

  const onClick = () => {
    if (user) {
      router.push(href);
    } else {
      return authModal.onOpen();
    }
  };
  return (
    <motion.button
      initial="hidden"
      animate="show"
      variants={slideIn("up", " ", Math.min(index, 8) * 0.05, 0.25)}
      onClick={onClick}
      aria-label={name}
      className="relative group flex items-center rounded-md overflow-hidden gap-x-4 bg-neutral-100/10 hover:bg-neutral-100/20 transition pr-4"
    >
      <div className="relative min-h-[64px] min-w-[64px] bg-gradient-to-br from-pink-700 to-neutral-200">
        <Image className="object-cover" fill sizes="64px" src={image} alt="" />
      </div>
      <p className="font-md truncate py-5">{name}</p>
      <div className="absolute transition opacity-0 rounded-full flex items-center justify-center bg-accent p-4 drop-shadow-md right-5 group-hover:opacity-100 hover:scale-110">
        <FaPlay className="text-black" />
      </div>
    </motion.button>
  );
};

export default ListItem;
