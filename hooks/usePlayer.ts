import { create } from "zustand";

interface PlayerStore {
  ids: number[];
  activeId?: number;
  isPlaying: boolean;
  volume: number;
  setId: (id: number) => void;
  setIds: (ids: number[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  reset: () => void;
}

/**
 * Playback queue state.
 *
 * `soundPosition` and `soundDuration` used to live here and were written by
 * a 500ms setInterval in PlayerContent. Because every consumer called
 * `usePlayer()` without a selector, that meant the Sidebar, the Library and
 * every visible MediaItem/SongItem re-rendered twice a second. Both values
 * are read only by PlayerContent, so they are local state there now.
 *
 * Consumers should subscribe with a selector — `usePlayer((s) => s.activeId)`
 * — so a volume change does not re-render a song tile.
 */
const usePlayer = create<PlayerStore>((set) => ({
  ids: [],
  activeId: undefined,
  isPlaying: false,
  volume: 1,
  setId: (id: number) => set({ activeId: id }),
  setIds: (ids: number[]) => set({ ids: ids }),
  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
  setVolume: (volume: number) => set({ volume }),
  reset: () => set({ ids: [], activeId: undefined, isPlaying: false, volume: 1 }),
}));

export default usePlayer;
