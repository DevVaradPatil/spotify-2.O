import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toggleLike = vi.fn();
let liked = new Set<number>();
vi.mock("@/hooks/useLikedSongs", () => ({
  useLikedSongs: () => ({
    isLiked: (id: number) => liked.has(id),
    toggleLike,
    likedIds: liked,
    isLoading: false,
  }),
}));

let currentUser: { id: string } | null = { id: "user-1" };
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: currentUser }),
}));

const onOpen = vi.fn();
vi.mock("@/hooks/useAuthModel", () => ({ default: () => ({ onOpen }) }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const LikeButton = (await import("./LikeButton")).default;

describe("LikeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liked = new Set<number>();
    currentUser = { id: "user-1" };
  });

  it("announces its state rather than being an unlabelled icon", () => {
    render(<LikeButton songId={1} />);
    const button = screen.getByRole("button", { name: /add to liked songs/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects an already-liked song", () => {
    liked = new Set([1]);
    render(<LikeButton songId={1} />);

    const button = screen.getByRole("button", {
      name: /remove from liked songs/i,
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles the like for the right song id", async () => {
    render(<LikeButton songId={42} />);
    await userEvent.click(screen.getByRole("button"));

    // Song ids are numbers end to end (DB-5); a string here would silently
    // miss in the liked set.
    expect(toggleLike).toHaveBeenCalledWith(42);
    expect(typeof toggleLike.mock.calls[0][0]).toBe("number");
  });

  it("opens the auth modal instead of writing when signed out", async () => {
    currentUser = null;
    render(<LikeButton songId={1} />);
    await userEvent.click(screen.getByRole("button"));

    expect(onOpen).toHaveBeenCalled();
    expect(toggleLike).not.toHaveBeenCalled();
  });
});
