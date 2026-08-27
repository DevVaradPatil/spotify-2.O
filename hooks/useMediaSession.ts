"use client";

import { useEffect } from "react";

import useLoadImage from "./useLoadImage";
import usePlayer from "./usePlayer";
import { Song } from "@/types";

/**
 * Media Session integration — lock-screen artwork and transport, OS media
 * overlays, and hardware/headset media keys.
 *
 * Worth having for a music app on mobile, where the browser tab is usually
 * backgrounded and the lock screen is the real interface.
 *
 * Guarded throughout: `navigator.mediaSession` is absent in some browsers, and
 * individual action handlers throw NotSupportedError rather than no-op when a
 * platform does not implement them.
 */
const useMediaSession = (song: Song | null) => {
  const imageUrl = useLoadImage(song);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const playNext = usePlayer((state) => state.playNext);
  const playPrevious = usePlayer((state) => state.playPrevious);
  const setIsPlaying = usePlayer((state) => state.setIsPlaying);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.author,
      album: "Spotify 2.O",
      artwork: imageUrl
        ? [{ src: imageUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
  }, [song, imageUrl]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => setIsPlaying(true)],
      ["pause", () => setIsPlaying(false)],
      ["nexttrack", () => playNext(true)],
      ["previoustrack", () => playPrevious()],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action unsupported on this platform.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Nothing to clear.
        }
      }
    };
  }, [playNext, playPrevious, setIsPlaying]);
};

export default useMediaSession;
