/**
 * The current playback position, held outside React on purpose.
 *
 * PlayerContent owns the audio element and ticks position every 500ms. Room
 * sync needs to read that position when broadcasting, but putting it in the
 * Zustand store would make every subscriber a candidate for re-rendering twice
 * a second — the exact problem PERF-2 removed.
 *
 * A plain module variable is non-reactive by construction: writes cost
 * nothing and nothing can accidentally subscribe to it.
 */
let position = 0;

export const setPlaybackPosition = (seconds: number) => {
  position = Number.isFinite(seconds) ? seconds : 0;
};

export const getPlaybackPosition = () => position;
