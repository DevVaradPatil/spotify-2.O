"use client"
import useOnPlay from '@/hooks/useOnPlay';
import { Song } from '@/types'
import Image from 'next/image';
import React from 'react'
import { FaPlay } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { slideIn } from '@/variants';

interface RandomButtonProps {
    songs: Song[];
}

const RandomButton: React.FC<RandomButtonProps> = ({ songs }) => {
    const onPlay = useOnPlay(songs);
    const onClick = () => {
        const randomIndex = Math.floor(Math.random() * songs.length);
        onPlay(songs[randomIndex].id);
    }
  return (
    <motion.button
    initial="hidden"
    animate="show"
    variants={slideIn( "up", " ", 0.50 , 0.25)}
      onClick={onClick}
      className="relative  group hidden md:flex items-center rounded-md overflow-hidden gap-x-4 bg-neutral-100/10 hover:bg-neutral-100/20 transition pr-4"
    >
      <div className="relative min-h-[64px] min-w-[64px] bg-gradient-to-br from-green-700 to-blue-200">
        <Image className=" scale-75" fill src='/images/random.png' alt="image"   />
      </div>
      <p className="font-md truncate py-5">Play Random Song</p>
      <div className="absolute transition opacity-0 rounded-full flex itec justify-center bg-green-500 p-4 drop-shadow-md right-5 group-hover:opacity-100 hover:scale-110">
        <FaPlay className="text-black" />
      </div>
    </motion.button>
  )
}

export default RandomButton