import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeQuery, makeSupabase } from "@/test/supabaseMock";

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: { error: toastError, success: toastSuccess },
}));

let currentUser: { id: string } | null = { id: "user-1" };
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: currentUser }),
}));

import type { QueryMock } from "@/test/supabaseMock";

let supabase: ReturnType<typeof makeSupabase>;
let likedSongsQuery: QueryMock<{ song_id: number }[]>;
vi.mock("@/hooks/useSupabase", () => ({
  useSupabaseClient: () => supabase,
}));

const { LikedSongsProvider, useLikedSongs } = await import("./useLikedSongs");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LikedSongsProvider>{children}</LikedSongsProvider>
);

const renderLiked = () => renderHook(() => useLikedSongs(), { wrapper });

describe("useLikedSongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: "user-1" };
    likedSongsQuery = makeQuery({
      data: [{ song_id: 1 }, { song_id: 2 }],
      error: null,
    });
    supabase = makeSupabase({ liked_songs: likedSongsQuery });
  });

  it("loads the user's liked songs once, not once per song", async () => {
    const { result } = renderLiked();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLiked(1)).toBe(true);
    expect(result.current.isLiked(2)).toBe(true);
    expect(result.current.isLiked(3)).toBe(false);
    // The N+1 this hook exists to fix: one query total.
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("reports loading until the set arrives", async () => {
    const { result } = renderLiked();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("returns an empty set and does not query when signed out", async () => {
    currentUser = null;
    const { result } = renderLiked();

    expect(result.current.likedIds.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("adds a like optimistically and writes it", async () => {
    likedSongsQuery = makeQuery({
      data: [{ song_id: 1 }],
      error: null,
    });
    supabase = makeSupabase({ liked_songs: likedSongsQuery });
    const { result } = renderLiked();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleLike(5);
    });

    expect(result.current.isLiked(5)).toBe(true);
    expect(likedSongsQuery.calls.map((c) => c.method)).toContain("insert");
    expect(toastSuccess).toHaveBeenCalledWith("Added to Liked Songs!");
  });

  it("removes an existing like with a delete rather than an insert", async () => {
    const { result } = renderLiked();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleLike(1);
    });

    expect(result.current.isLiked(1)).toBe(false);
    expect(likedSongsQuery.calls.map((c) => c.method)).toContain("delete");
  });

  it("rolls the optimistic update back when the write fails", async () => {
    const likedSongs = makeQuery({ data: [], error: null });
    supabase = makeSupabase({ liked_songs: likedSongs });

    const { result } = renderLiked();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Make the write fail on the builder the hook already holds.
    likedSongs.setResult({ data: null, error: { message: "insert denied" } });

    await act(async () => {
      await result.current.toggleLike(9);
    });

    // Optimistically added, then reverted — the UI must not claim a like that
    // the database rejected.
    expect(result.current.isLiked(9)).toBe(false);
    expect(toastError).toHaveBeenCalledWith("insert denied");
  });

  it("throws when used outside its provider", () => {
    expect(() => renderHook(() => useLikedSongs())).toThrow(
      /must be used within a LikedSongsProvider/
    );
  });
});
