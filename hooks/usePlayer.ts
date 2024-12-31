import { create } from "zustand";

interface PlayerStore {
    ids: string[];
    activeId?: string;
    isPlaying: boolean;
    volume: number;
    soundPosition: number;
    soundDuration: number;
    setId: (id: string) => void;
    setIds: (ids: string[]) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    setSoundPosition: (position: number) => void;
    setSoundDuration: (duration: number) => void;
    reset: () => void;
}

const usePlayer = create<PlayerStore>((set) => ({
    ids: [],
    activeId: undefined,
    isPlaying: false,
    volume: 1,
    soundPosition: 0,
    soundDuration: 0,
    setId: (id: string) => set({ activeId: id }),
    setIds: (ids: string[]) => set({ ids: ids }),
    setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
    setVolume: (volume: number) => set({ volume }),
    setSoundPosition: (position: number) => set({ soundPosition: position }),
    setSoundDuration: (duration: number) => set({ soundDuration: duration }),
    reset: () => set({ ids: [], activeId: undefined, isPlaying: false, volume: 1, soundPosition: 0, soundDuration: 0 })
}));

export default usePlayer;