"use client";

import { useCallback, useState } from "react";

import useGetSongById from "@/hooks/useGetSongById";
import useLoadSongUrl from "@/hooks/useLoadSongUrl";
import useMediaSession from "@/hooks/useMediaSession";
import useRecordPlay from "@/hooks/useRecordPlay";
import usePlayer from "@/hooks/usePlayer";
import PlayerContent from "./PlayerContent";
import Queue from "./Queue";

const Player = () => {
  const activeId = usePlayer((state) => state.activeId);
  const { song } = useGetSongById(activeId);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const songUrl = useLoadSongUrl(song ?? null);

  const toggleQueue = useCallback(() => setIsQueueOpen((open) => !open), []);
  const closeQueue = useCallback(() => setIsQueueOpen(false), []);

  // Lock-screen and hardware media key integration. Lives here rather than in
  // PlayerContent because PlayerContent is keyed by songUrl and remounts on
  // every track change.
  useMediaSession(song ?? null);

  // Recorded here, not in useOnPlay: this catches auto-advance, repeat and
  // remote room changes, not just tracks the user clicked.
  useRecordPlay(activeId);

  if (!song || !songUrl || !activeId) {
    return null;
  }

  return (
    <>
      <Queue isOpen={isQueueOpen} onClose={closeQueue} />
      <div className="fixed bottom-0 bg-canvas w-full py-2 h-[80px] px-4">
        {/*
          Keyed by songUrl on purpose: remounting is what swaps the howler
          instance, so this is the track-change mechanism, not an accident.
        */}
        <PlayerContent
          song={song}
          songUrl={songUrl}
          isQueueOpen={isQueueOpen}
          onToggleQueue={toggleQueue}
          key={songUrl}
        />
      </div>
    </>
  );
};

export default Player;
