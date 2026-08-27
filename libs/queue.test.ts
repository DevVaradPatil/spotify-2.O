import { describe, expect, it } from "vitest";

import {
  getNextId,
  getPreviousId,
  nextRepeatMode,
  shuffle,
  shuffleKeepingFirst,
} from "./queue";

const QUEUE = [1, 2, 3, 4];

describe("getNextId", () => {
  it("advances through the queue", () => {
    expect(getNextId(QUEUE, 1, "off")).toBe(2);
    expect(getNextId(QUEUE, 3, "off")).toBe(4);
  });

  it("stops at the end when repeat is off", () => {
    expect(getNextId(QUEUE, 4, "off")).toBeUndefined();
  });

  it("wraps at the end when repeat is all", () => {
    expect(getNextId(QUEUE, 4, "all")).toBe(1);
  });

  it("repeats the current track when a track ends under repeat-one", () => {
    expect(getNextId(QUEUE, 2, "one")).toBe(2);
  });

  it("still advances when the user presses next under repeat-one", () => {
    // Repeat-one should not trap the user on one track.
    expect(getNextId(QUEUE, 2, "one", true)).toBe(3);
  });

  it("wraps on an explicit next from the last track under repeat-one", () => {
    expect(getNextId(QUEUE, 4, "one", true)).toBe(1);
  });

  it("starts at the beginning with no active track", () => {
    expect(getNextId(QUEUE, undefined, "off")).toBe(1);
  });

  it("recovers when the active track is not in the queue", () => {
    expect(getNextId(QUEUE, 99, "off")).toBe(1);
  });

  it("returns undefined for an empty queue", () => {
    expect(getNextId([], 1, "all")).toBeUndefined();
  });

  it("handles a single-track queue under each repeat mode", () => {
    expect(getNextId([7], 7, "off")).toBeUndefined();
    expect(getNextId([7], 7, "all")).toBe(7);
    expect(getNextId([7], 7, "one")).toBe(7);
  });
});

describe("getPreviousId", () => {
  it("steps backwards", () => {
    expect(getPreviousId(QUEUE, 3)).toBe(2);
  });

  it("wraps to the end from the first track", () => {
    expect(getPreviousId(QUEUE, 1)).toBe(4);
  });

  it("returns undefined for an empty queue", () => {
    expect(getPreviousId([], 1)).toBeUndefined();
  });

  it("recovers when the active track is not in the queue", () => {
    expect(getPreviousId(QUEUE, 99)).toBe(1);
  });
});

describe("shuffle", () => {
  it("keeps every element exactly once", () => {
    const result = shuffle(QUEUE);
    expect([...result].sort()).toEqual([...QUEUE].sort());
  });

  it("does not mutate the input", () => {
    const input = [...QUEUE];
    shuffle(input);
    expect(input).toEqual(QUEUE);
  });

  it("is deterministic given a deterministic random source", () => {
    // Always picking index 0 reverses the array under Fisher-Yates.
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});

describe("shuffleKeepingFirst", () => {
  it("keeps the current track at the front", () => {
    const result = shuffleKeepingFirst(QUEUE, 3);
    expect(result[0]).toBe(3);
    expect([...result].sort()).toEqual([...QUEUE].sort());
  });

  it("falls back to a plain shuffle when the track is absent", () => {
    const result = shuffleKeepingFirst(QUEUE, 99);
    expect([...result].sort()).toEqual([...QUEUE].sort());
  });
});

describe("nextRepeatMode", () => {
  it("cycles off -> all -> one -> off", () => {
    expect(nextRepeatMode("off")).toBe("all");
    expect(nextRepeatMode("all")).toBe("one");
    expect(nextRepeatMode("one")).toBe("off");
  });
});
