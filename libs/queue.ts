export type RepeatMode = "off" | "all" | "one";

/**
 * Queue navigation, kept as pure functions so the rules can be tested without
 * mounting a player or faking howler.
 *
 * `order` is the sequence actually being played — the shuffled order when
 * shuffle is on, the original otherwise — so nothing here needs to know that
 * shuffle exists.
 */

/** Fisher-Yates. Returns a new array; the input is not mutated. */
export const shuffle = <T>(items: readonly T[], random = Math.random): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Shuffle that keeps `first` at the front, so turning shuffle on mid-track
 * reorders what comes next without interrupting what is playing.
 */
export const shuffleKeepingFirst = <T>(
  items: readonly T[],
  first: T,
  random = Math.random
): T[] => {
  const rest = items.filter((item) => item !== first);
  return items.includes(first)
    ? [first, ...shuffle(rest, random)]
    : shuffle(items, random);
};

/**
 * The next track, or undefined when playback should stop.
 *
 * - `one` repeats the current track, including when it ends naturally.
 * - `all` wraps past the end.
 * - `off` stops at the end.
 *
 * `isExplicit` distinguishes the user pressing next — which should always
 * advance, even under repeat-one — from a track ending on its own.
 */
export const getNextId = (
  order: readonly number[],
  activeId: number | undefined,
  repeat: RepeatMode,
  isExplicit = false
): number | undefined => {
  if (order.length === 0) return undefined;
  if (activeId === undefined) return order[0];

  if (repeat === "one" && !isExplicit) return activeId;

  const index = order.indexOf(activeId);
  if (index === -1) return order[0];

  const nextIndex = index + 1;
  if (nextIndex < order.length) return order[nextIndex];

  // Past the end.
  if (repeat === "all") return order[0];
  if (repeat === "one" && isExplicit) return order[0];
  return undefined;
};

/**
 * The previous track. Always wraps, matching how every music player behaves —
 * pressing previous at the start of a queue is never a no-op.
 */
export const getPreviousId = (
  order: readonly number[],
  activeId: number | undefined
): number | undefined => {
  if (order.length === 0) return undefined;
  if (activeId === undefined) return order[0];

  const index = order.indexOf(activeId);
  if (index === -1) return order[0];

  return index > 0 ? order[index - 1] : order[order.length - 1];
};

/** Cycles off -> all -> one -> off. */
export const nextRepeatMode = (mode: RepeatMode): RepeatMode =>
  mode === "off" ? "all" : mode === "all" ? "one" : "off";
