"use client";

import { useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { MdDragIndicator } from "react-icons/md";

import { useSupabaseClient } from "@/hooks/useSupabase";
import usePlayer from "@/hooks/usePlayer";
import { Song } from "@/types";
import MediaItem from "./MediaItem";

interface QueueProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The queue was previously state with no UI — `ids` existed in the store but
 * nothing rendered it, so there was no way to see or change what was coming.
 *
 * Renders the play order (the shuffled sequence when shuffle is on), not the
 * insertion order, so what you read is what you will hear.
 */
const Queue: React.FC<QueueProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabaseClient();
  const order = usePlayer((state) => state.order);
  const activeId = usePlayer((state) => state.activeId);
  const setId = usePlayer((state) => state.setId);
  const removeFromQueue = usePlayer((state) => state.removeFromQueue);

  const [loaded, setLoaded] = useState<{ key: string; songs: Song[] }>({
    key: "",
    songs: [],
  });

  // Keyed by the order it was loaded for, so "is this list current?" is
  // derived rather than cleared with a synchronous setState in the effect.
  const isStale = loaded.key !== order.join(",");
  const songs = isOpen && !isStale ? loaded.songs : [];

  useEffect(() => {
    if (!isOpen || order.length === 0) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase.from("songs").select("*").in("id", order);
      if (cancelled || !data) return;
      // `.in()` does not preserve the requested order, so re-sort to the
      // play order rather than showing whatever Postgres returned.
      const byId = new Map(data.map((song) => [song.id, song]));
      setLoaded({
        key: order.join(","),
        songs: order.map((id) => byId.get(id)).filter((s): s is Song => !!s),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, order, supabase]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const upNextCount = songs.findIndex((s) => s.id === activeId);
  const remaining = upNextCount === -1 ? songs.length : songs.length - upNextCount - 1;

  return (
    <aside
      aria-label="Play queue"
      className="fixed bottom-[80px] right-0 z-40 w-full max-w-sm h-[60vh] flex flex-col rounded-t-lg border border-surface-hover bg-surface shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-surface-hover px-4 py-3">
        <div>
          <h2 className="font-semibold text-content">Queue</h2>
          <p className="text-xs text-content-muted">
            {remaining} {remaining === 1 ? "track" : "tracks"} up next
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close queue"
          className="rounded-full p-1 text-content-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <IoMdClose size={20} aria-hidden="true" />
        </button>
      </header>

      <ol className="flex-1 overflow-y-auto p-2">
        {songs.length === 0 && (
          <li className="p-4 text-sm text-content-muted">The queue is empty.</li>
        )}
        {songs.map((song, index) => (
          <li
            key={song.id}
            className={`group flex items-center gap-x-2 rounded-md ${
              song.id === activeId ? "bg-surface-raised" : ""
            }`}
          >
            <MdDragIndicator
              size={18}
              aria-hidden="true"
              className="shrink-0 text-content-subtle opacity-0 group-hover:opacity-100"
            />
            <div className="min-w-0 flex-1">
              <MediaItem data={song} onClick={setId} index={index} inPlayer />
            </div>
            <button
              onClick={() => removeFromQueue(song.id)}
              aria-label={`Remove ${song.title} from the queue`}
              className="shrink-0 rounded-full p-2 text-content-subtle opacity-0 transition hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:opacity-100"
            >
              <IoMdClose size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
};

export default Queue;
