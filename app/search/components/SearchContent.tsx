"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useOnPlay from "@/hooks/useOnPlay";
import { Artist, Song } from "@/types";
import { slideIn } from "@/variants";

interface SearchContentProps {
  songs: Song[];
  artists: Artist[];
  query: string;
}

type Filter = "all" | "songs" | "artists";

const SearchContent: React.FC<SearchContentProps> = ({ songs, artists, query }) => {
  const onPlay = useOnPlay(songs);
  const [filter, setFilter] = useState<Filter>("all");

  if (songs.length === 0 && artists.length === 0) {
    return (
      <div className="flex flex-col gap-y-2 w-full px-6 text-content-muted">
        {query ? `No results for “${query}”.` : "No songs found."}
      </div>
    );
  }

  const showSongs = filter !== "artists" && songs.length > 0;
  const showArtists = filter !== "songs" && artists.length > 0;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: songs.length + artists.length },
    { key: "songs", label: "Songs", count: songs.length },
    { key: "artists", label: "Artists", count: artists.length },
  ];

  return (
    <div className="flex flex-col gap-y-6 w-full px-6 pb-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter results">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            disabled={count === 0}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              filter === key
                ? "bg-accent text-black"
                : "bg-surface-hover text-content hover:bg-surface-raised"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {showArtists && (
        <section aria-labelledby="search-artists">
          <h2 id="search-artists" className="mb-3 text-xl font-semibold text-content">
            Artists
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {artists.map((artist) => (
              <li key={artist.id}>
                <Link
                  href={`/artist/${artist.slug}`}
                  className="group flex flex-col items-center gap-y-2 rounded-md bg-neutral-400/5 p-3 transition hover:bg-neutral-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-500 text-2xl font-bold text-black"
                    aria-hidden="true"
                  >
                    {artist.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="w-full truncate text-center text-sm font-medium text-content">
                    {artist.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showSongs && (
        <section aria-labelledby="search-songs">
          <h2 id="search-songs" className="mb-3 text-xl font-semibold text-content">
            Songs
          </h2>
          <div className="flex flex-col gap-y-2">
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
        </section>
      )}
    </div>
  );
};

export default SearchContent;
