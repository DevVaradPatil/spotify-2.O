import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  getNextId,
  getPreviousId,
  moveItem,
  nextRepeatMode,
  shuffleKeepingFirst,
  type RepeatMode,
} from "@/libs/queue";

interface PlayerStore {
  /** The queue in the order it was added. */
  ids: number[];
  /** The queue in play order — reshuffled when shuffle is on. */
  order: number[];
  activeId?: number;
  isPlaying: boolean;
  volume: number;
  isShuffled: boolean;
  repeat: RepeatMode;

  setId: (id: number) => void;
  setIds: (ids: number[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  /** `isExplicit` marks a user press, which advances even under repeat-one. */
  playNext: (isExplicit?: boolean) => void;
  playPrevious: () => void;
  removeFromQueue: (id: number) => void;
  reorderQueue: (from: number, to: number) => void;
  /**
   * Ask the player to seek. PlayerContent owns the audio element, so this is
   * an intent rather than a direct call; the nonce makes repeat seeks to the
   * same position distinguishable.
   */
  pendingSeek?: { position: number; nonce: number };
  requestSeek: (position: number) => void;
  reset: () => void;
}

/**
 * Playback queue state.
 *
 * Navigation rules live in libs/queue.ts as pure functions so they can be
 * tested without mounting a player; this store holds state and delegates.
 *
 * `soundPosition` and `soundDuration` are deliberately absent — they tick
 * every 500ms and are read only by PlayerContent, so they are local state
 * there. Putting them back would re-render every subscriber twice a second.
 *
 * Consumers should subscribe with a selector: `usePlayer((s) => s.activeId)`.
 */
const usePlayer = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ids: [],
      order: [],
      activeId: undefined,
      isPlaying: false,
      volume: 1,
      isShuffled: false,
      repeat: "off",

      setId: (id: number) => set({ activeId: id }),

      setIds: (ids: number[]) =>
        set((state) => ({
          ids,
          order: state.isShuffled
            ? shuffleKeepingFirst(ids, state.activeId ?? ids[0])
            : ids,
        })),

      setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
      setVolume: (volume: number) => set({ volume }),

      toggleShuffle: () =>
        set((state) => {
          const isShuffled = !state.isShuffled;
          return {
            isShuffled,
            order: isShuffled
              ? shuffleKeepingFirst(state.ids, state.activeId ?? state.ids[0])
              : state.ids,
          };
        }),

      cycleRepeat: () => set((state) => ({ repeat: nextRepeatMode(state.repeat) })),

      playNext: (isExplicit = false) => {
        const { order, activeId, repeat } = get();
        const next = getNextId(order, activeId, repeat, isExplicit);
        if (next === undefined) {
          set({ isPlaying: false });
          return;
        }
        set({ activeId: next });
      },

      playPrevious: () => {
        const { order, activeId } = get();
        const previous = getPreviousId(order, activeId);
        if (previous !== undefined) set({ activeId: previous });
      },

      removeFromQueue: (id: number) =>
        set((state) => ({
          ids: state.ids.filter((queued) => queued !== id),
          order: state.order.filter((queued) => queued !== id),
        })),

      // Reorders the play order only. `ids` keeps the original sequence so
      // turning shuffle off still restores what the user started with.
      reorderQueue: (from: number, to: number) =>
        set((state) => ({ order: moveItem(state.order, from, to) })),

      requestSeek: (position: number) =>
        set((state) => ({
          pendingSeek: {
            position,
            nonce: (state.pendingSeek?.nonce ?? 0) + 1,
          },
        })),

      reset: () =>
        set({
          ids: [],
          order: [],
          activeId: undefined,
          isPlaying: false,
          isShuffled: false,
          repeat: "off",
          pendingSeek: undefined,
        }),
    }),
    {
      name: "spotify2o-player",
      storage: createJSONStorage(() => localStorage),
      // FEAT-12 — the queue and preferences survive a reload. isPlaying is
      // excluded on purpose: browsers block autoplay on a fresh load, so
      // restoring it true would show a play state that is not real.
      partialize: (state) => ({
        ids: state.ids,
        order: state.order,
        activeId: state.activeId,
        volume: state.volume,
        isShuffled: state.isShuffled,
        repeat: state.repeat,
      }),
    }
  )
);

export default usePlayer;
