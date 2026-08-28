import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toggleFollowAction = vi.fn();
vi.mock("@/actions/mutations", () => ({
  toggleFollow: (...args: unknown[]) => toggleFollowAction(...args),
}));

const toastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: { error: toastError, success: vi.fn() },
}));

let currentUser: { id: string } | null = { id: "user-1" };
vi.mock("@/hooks/useUser", () => ({ useUser: () => ({ user: currentUser }) }));

const onOpen = vi.fn();
vi.mock("@/hooks/useAuthModel", () => ({ default: () => ({ onOpen }) }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const FollowButton = (await import("./FollowButton")).default;

const renderButton = (props?: Partial<React.ComponentProps<typeof FollowButton>>) =>
  render(
    <FollowButton
      artistId={7}
      artistName="Avicii"
      initialIsFollowing={false}
      initialFollowerCount={3}
      {...props}
    />
  );

describe("FollowButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: "user-1" };
    toggleFollowAction.mockResolvedValue({ following: true });
  });

  it("names the action and the artist", () => {
    renderButton();
    const button = screen.getByRole("button", { name: /follow avicii/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("follows optimistically and bumps the count", async () => {
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /follow avicii/i }));

    expect(screen.getByText("4 followers")).toBeInTheDocument();
    expect(toggleFollowAction).toHaveBeenCalledWith(7);
  });

  it("unfollows an artist it already follows", async () => {
    toggleFollowAction.mockResolvedValue({ following: false });
    renderButton({ initialIsFollowing: true, initialFollowerCount: 10 });
    await userEvent.click(screen.getByRole("button", { name: /unfollow avicii/i }));

    expect(screen.getByText("9 followers")).toBeInTheDocument();
    expect(toggleFollowAction).toHaveBeenCalledWith(7);
  });

  it("rolls back the count when the write fails", async () => {
    toggleFollowAction.mockResolvedValue({ error: "denied" });
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /follow avicii/i }));

    // The count must not claim a follower the database rejected.
    expect(screen.getByText("3 followers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /follow avicii/i })).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith("denied");
  });

  it("uses the singular for one follower", () => {
    renderButton({ initialFollowerCount: 1 });
    expect(screen.getByText("1 follower")).toBeInTheDocument();
  });

  it("opens the auth modal instead of writing when signed out", async () => {
    currentUser = null;
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /follow avicii/i }));

    expect(onOpen).toHaveBeenCalled();
    expect(toggleFollowAction).not.toHaveBeenCalled();
  });
});
