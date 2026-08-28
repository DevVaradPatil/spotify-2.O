"use client";

import { useEffect, useRef } from "react";

import { useSupabaseClient } from "./useSupabase";
import { useUser } from "./useUser";

/**
 * Time a track must remain active before it counts as played, so skipping
 * through a queue does not fill history with tracks nobody heard.
 */
const DWELL_MS = 10_000;

/**
 * Records a play_events row when a track has been active long enough.
 *
 * Lives in Player rather than useOnPlay on purpose: useOnPlay only fires when
 * the user picks a track, so auto-advance, repeat and remote room changes
 * would all be missing from history. Watching activeId catches every way a
 * track can start.
 */
const useRecordPlay = (songId: number | undefined) => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  // Guards against double-recording when the component remounts, which it
  // does on every track change because Player is keyed by songUrl.
  const lastRecorded = useRef<number | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !songId || lastRecorded.current === songId) return;

    const timer = setTimeout(async () => {
      lastRecorded.current = songId;
      const { error } = await supabase
        .from("play_events")
        .insert({ user_id: userId, song_id: songId });

      // History is a nice-to-have; a failure here must never interrupt
      // playback, so it is logged rather than surfaced.
      if (error) console.error("[useRecordPlay]", error.message);
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [songId, user?.id, supabase]);
};

export default useRecordPlay;
