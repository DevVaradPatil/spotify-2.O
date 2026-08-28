import { beforeEach, describe, expect, it } from "vitest";

import usePlayer from "./usePlayer";

const reset = () => {
  usePlayer.getState().reset();
  usePlayer.setState({ volume: 1 });
};

describe("usePlayer", () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  it("mirrors ids into play order when shuffle is off", () => {
    usePlayer.getState().setIds([1, 2, 3]);
    expect(usePlayer.getState().order).toEqual([1, 2, 3]);
  });

  it("advances and wraps according to repeat mode", () => {
    const { setIds, setId, playNext } = usePlayer.getState();
    setIds([1, 2, 3]);
    setId(1);

    playNext();
    expect(usePlayer.getState().activeId).toBe(2);

    setId(3);
    playNext();
    // repeat is off, so playback stops rather than wrapping.
    expect(usePlayer.getState().activeId).toBe(3);
    expect(usePlayer.getState().isPlaying).toBe(false);

    usePlayer.getState().cycleRepeat(); // -> all
    playNext();
    expect(usePlayer.getState().activeId).toBe(1);
  });

  it("keeps repeat-one on the same track when a track ends", () => {
    const { setIds, setId, cycleRepeat, playNext } = usePlayer.getState();
    setIds([1, 2, 3]);
    setId(2);
    cycleRepeat(); // all
    cycleRepeat(); // one

    playNext();
    expect(usePlayer.getState().activeId).toBe(2);
  });

  it("still advances on an explicit next under repeat-one", () => {
    const { setIds, setId, cycleRepeat, playNext } = usePlayer.getState();
    setIds([1, 2, 3]);
    setId(2);
    cycleRepeat();
    cycleRepeat();

    playNext(true);
    expect(usePlayer.getState().activeId).toBe(3);
  });

  it("wraps backwards from the first track", () => {
    const { setIds, setId, playPrevious } = usePlayer.getState();
    setIds([1, 2, 3]);
    setId(1);
    playPrevious();
    expect(usePlayer.getState().activeId).toBe(3);
  });

  it("keeps the current track first when shuffle is enabled mid-play", () => {
    const { setIds, setId, toggleShuffle } = usePlayer.getState();
    setIds([1, 2, 3, 4, 5]);
    setId(4);
    toggleShuffle();

    const { order, isShuffled } = usePlayer.getState();
    expect(isShuffled).toBe(true);
    expect(order[0]).toBe(4);
    expect([...order].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("restores the original order when shuffle is turned off", () => {
    const { setIds, setId, toggleShuffle } = usePlayer.getState();
    setIds([1, 2, 3, 4, 5]);
    setId(3);
    toggleShuffle();
    toggleShuffle();

    expect(usePlayer.getState().order).toEqual([1, 2, 3, 4, 5]);
    expect(usePlayer.getState().isShuffled).toBe(false);
  });

  it("drops a track from both the queue and the play order", () => {
    const { setIds, toggleShuffle, removeFromQueue } = usePlayer.getState();
    setIds([1, 2, 3]);
    toggleShuffle();
    removeFromQueue(2);

    expect(usePlayer.getState().ids).not.toContain(2);
    expect(usePlayer.getState().order).not.toContain(2);
  });

  it("does not persist isPlaying", () => {
    const { setIds, setId, setIsPlaying } = usePlayer.getState();
    setIds([1, 2]);
    setId(1);
    setIsPlaying(true);

    const stored = JSON.parse(localStorage.getItem("spotify2o-player") ?? "{}");
    expect(stored.state.activeId).toBe(1);
    // Browsers block autoplay on load, so a restored `true` would be a lie.
    expect(stored.state.isPlaying).toBeUndefined();
  });
});

describe("usePlayer queue reordering", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayer.getState().reset();
  });

  it("reorders the play order", () => {
    const { setIds, reorderQueue } = usePlayer.getState();
    setIds([1, 2, 3, 4]);
    reorderQueue(0, 2);
    expect(usePlayer.getState().order).toEqual([2, 3, 1, 4]);
  });

  it("leaves the original ids untouched so un-shuffling still works", () => {
    const { setIds, reorderQueue } = usePlayer.getState();
    setIds([1, 2, 3, 4]);
    reorderQueue(3, 0);

    expect(usePlayer.getState().order).toEqual([4, 1, 2, 3]);
    expect(usePlayer.getState().ids).toEqual([1, 2, 3, 4]);
  });

  it("keeps navigation consistent with the new order", () => {
    const { setIds, setId, reorderQueue, playNext } = usePlayer.getState();
    setIds([1, 2, 3]);
    setId(1);
    reorderQueue(2, 1); // -> [1, 3, 2]

    playNext(true);
    expect(usePlayer.getState().activeId).toBe(3);
  });
});

describe("usePlayer seek requests", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayer.getState().reset();
  });

  it("records a seek intent", () => {
    usePlayer.getState().requestSeek(42);
    expect(usePlayer.getState().pendingSeek?.position).toBe(42);
  });

  it("bumps the nonce so repeat seeks to the same position still apply", () => {
    const { requestSeek } = usePlayer.getState();
    requestSeek(30);
    const first = usePlayer.getState().pendingSeek!.nonce;
    requestSeek(30);
    const second = usePlayer.getState().pendingSeek!.nonce;

    expect(second).toBeGreaterThan(first);
  });

  it("does not persist a seek intent across reloads", () => {
    usePlayer.getState().requestSeek(15);
    const stored = JSON.parse(localStorage.getItem("spotify2o-player") ?? "{}");
    expect(stored.state.pendingSeek).toBeUndefined();
  });
});
