import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeQuery, makeSupabase, type QueryMock } from "@/test/supabaseMock";

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: { error: toastError, success: toastSuccess },
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-1" } }),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const togglePlaylistSongAction = vi.fn();
vi.mock("@/actions/mutations", () => ({
  togglePlaylistSong: (...args: unknown[]) => togglePlaylistSongAction(...args),
}));

let supabase: ReturnType<typeof makeSupabase>;
vi.mock("@/hooks/useSupabase", () => ({
  useSupabaseClient: () => supabase,
}));

// next/image needs a plain img in jsdom.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src: string; alt: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

const AddToPlaylist = (await import("./AddToPlaylist")).default;

const PLAYLISTS = [
  { id: 10, user_id: "user-1", name: "Road trip", desc: "", image_path: "a.jpg" },
  { id: 20, user_id: "user-1", name: "Focus", desc: "", image_path: "b.jpg" },
];

/** The song is already in playlist 10 and not in 20. */
const setup = (memberships = [{ playlist_id: 10 }]) => {
  const playlists = makeQuery({ data: PLAYLISTS, error: null });
  const playlistSongs = makeQuery({
    data: memberships,
    error: null,
  });
  supabase = makeSupabase({
    playlists,
    playlist_songs: playlistSongs,
  });
  return { playlists, playlistSongs };
};

const openModal = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /add to playlist/i }));
  await screen.findByText("Road trip");
  return user;
};

describe("AddToPlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    togglePlaylistSongAction.mockResolvedValue({ added: true });
    setup();
  });

  it("lists the user's playlists when opened", async () => {
    render(<AddToPlaylist songId={1} />);
    await openModal();

    expect(screen.getByText("Road trip")).toBeInTheDocument();
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });

  it("reads membership from playlist_songs, not from an array column", async () => {
    render(<AddToPlaylist songId={1} />);
    await openModal();

    // The whole point of DB-8: membership is a join-table query.
    expect(supabase.from).toHaveBeenCalledWith("playlist_songs");
  });

  it("removes the song when it is already in the playlist", async () => {
    setup([{ playlist_id: 10 }]);
    togglePlaylistSongAction.mockResolvedValue({ added: false });
    render(<AddToPlaylist songId={1} />);
    const user = await openModal();

    await user.click(screen.getByRole("button", { name: /remove from road trip/i }));

    // Ownership, existence and ordering are decided server-side now.
    await waitFor(() => expect(togglePlaylistSongAction).toHaveBeenCalledWith(10, 1));
    expect(toastSuccess).toHaveBeenCalledWith("Song removed from playlist");
  });

  it("adds the song when it is not in the playlist", async () => {
    setup([]);
    render(<AddToPlaylist songId={1} />);
    const user = await openModal();

    await user.click(screen.getByRole("button", { name: /add to focus/i }));

    await waitFor(() => expect(togglePlaylistSongAction).toHaveBeenCalledWith(20, 1));
    expect(toastSuccess).toHaveBeenCalledWith("Song added to playlist");
  });

  it("surfaces a write failure instead of reporting success", async () => {
    setup([]);
    togglePlaylistSongAction.mockResolvedValue({ error: "row level security" });
    render(<AddToPlaylist songId={1} />);
    const user = await openModal();

    await user.click(screen.getByRole("button", { name: /add to focus/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("row level security"));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("does nothing without a song id", async () => {
    render(<AddToPlaylist songId={undefined} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /add to playlist/i }));

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
