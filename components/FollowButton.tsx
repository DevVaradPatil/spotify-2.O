"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import useAuthModal from "@/hooks/useAuthModel";
import { useUser } from "@/hooks/useUser";
import { toggleFollow } from "@/actions/mutations";

interface FollowButtonProps {
  artistId: number;
  artistName: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  artistId,
  artistName,
  initialIsFollowing,
  initialFollowerCount,
}) => {
  const { user } = useUser();
  const authModal = useAuthModal();
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, setIsPending] = useState(false);

  const toggle = async () => {
    if (!user) return authModal.onOpen();
    if (isPending) return;

    setIsPending(true);
    const wasFollowing = isFollowing;

    // Optimistic, reverted below if the write fails.
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));

    const result = await toggleFollow(artistId);

    if ("error" in result) {
      setIsFollowing(wasFollowing);
      setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
      toast.error(result.error);
    } else {
      router.refresh();
    }

    setIsPending(false);
  };

  return (
    <div className="flex items-center gap-x-3">
      <button
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isFollowing}
        aria-label={isFollowing ? `Unfollow ${artistName}` : `Follow ${artistName}`}
        className={`rounded-full px-6 py-2 font-semibold transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          isFollowing
            ? "border border-content-muted text-content hover:border-white"
            : "bg-accent text-black hover:bg-accent-hover"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
      <p className="text-sm text-content-muted" aria-live="polite">
        {followerCount} {followerCount === 1 ? "follower" : "followers"}
      </p>
    </div>
  );
};

export default FollowButton;
