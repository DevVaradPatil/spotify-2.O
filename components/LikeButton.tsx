"use client";

import useAuthModal from "@/hooks/useAuthModel";
import { useUser } from "@/hooks/useUser";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useRouter } from "next/navigation";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";

interface LikeButtonProps {
  songId: number;
}

const LikeButton: React.FC<LikeButtonProps> = ({ songId }) => {
  const router = useRouter();
  const authModal = useAuthModal();
  const { user } = useUser();
  // Reads from the page-level set rather than issuing its own query.
  const { isLiked, toggleLike } = useLikedSongs();

  const liked = isLiked(songId);
  const Icon = liked ? AiFillHeart : AiOutlineHeart;

  const handleLike = async () => {
    if (!user) {
      return authModal.onOpen();
    }
    await toggleLike(songId);
    router.refresh();
  };

  return (
    <button
      onClick={handleLike}
      aria-label={liked ? "Remove from liked songs" : "Add to liked songs"}
      aria-pressed={liked}
      className="hover:opacity-75 transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon color={liked ? "#22c55e" : "white"} size={25} aria-hidden="true" />
    </button>
  );
};

export default LikeButton;
