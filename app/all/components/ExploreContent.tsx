"use client"
import SongItem from '@/components/SongItem';
import useOnPlay from '@/hooks/useOnPlay';
import { Song } from '@/types';
import React, { useState } from 'react';
import { BsSortAlphaDown, BsSortAlphaUp, BsArrowUp, BsArrowDown } from 'react-icons/bs'

interface ExploreContentProps {
  songs: Song[];
}

const ExploreContent: React.FC<ExploreContentProps> = ({ songs }) => {
  const [sortBy, setSortBy] = useState<'alphabetical' | 'alphabeticalrev' | 'createdAt' | 'createdAtrev'>('createdAt');

  const onPlay = useOnPlay(songs);

  if (songs.length === 0) {
    return (
      <div className='mt-4 text-neutral-400'>
        No Songs Available
      </div>
    );
  }

  const sortedSongs = [...songs];
  if (sortBy === 'alphabetical') {
    sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'alphabeticalrev') {
    sortedSongs.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortBy === 'createdAtrev') {
    sortedSongs.reverse()
  }

  return (
    <div className='mt-0 md:mt-4'>
      <div className='mb-2 flex items-center gap-2 flex-wrap'>
        <span className='mr-1 md:text-lg hidden md:flex'>Sort By :</span>
        <button
          className={`p-2 bg-neutral-600 flex gap-2 rounded-xl border-2 border-transparent ${sortBy === 'createdAt' ? ' bg-neutral-800 border-neutral-500' : ''}`}
          onClick={() => setSortBy('createdAt')}
        >
          Created At <BsArrowUp size={22} />
        </button>
        <button
          className={`p-2 bg-neutral-600 flex gap-2 rounded-xl border-2 border-transparent ${sortBy === 'createdAtrev' ? ' bg-neutral-800 border-neutral-500' : ''}`}
          onClick={() => setSortBy('createdAtrev')}
        >
          Created At <BsArrowDown size={22} />
        </button>
        <button
          className={`p-2 bg-neutral-600 flex gap-2 rounded-xl border-2 border-transparent ${sortBy === 'alphabetical' ? ' bg-neutral-800 border-neutral-500' : ''}`}
          onClick={() => setSortBy('alphabetical')}
        >
            Title
          <BsSortAlphaDown size={24} />
        </button>
        <button
          className={`p-2 bg-neutral-600 flex gap-2 rounded-xl border-2 border-transparent ${sortBy === 'alphabeticalrev' ? ' bg-neutral-800 border-neutral-500' : ''}`}
          onClick={() => setSortBy('alphabeticalrev')}
        >
            Title
          <BsSortAlphaUp size={24} />
        </button>
        
      </div>
      <div className='grid mt-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'>
        {sortedSongs.map((item, index) => (
          <SongItem
            key={item.id}
            onClick={(id: string) => onPlay(id)}
            data={item}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default ExploreContent;
