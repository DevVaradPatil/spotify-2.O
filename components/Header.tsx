"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { RxCaretLeft, RxCaretRight } from "react-icons/rx";
import { HiHome } from "react-icons/hi";
import { BiSearch } from "react-icons/bi";
import Button from "./Button";
import useAuthModal from "@/hooks/useAuthModel";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useUser } from "@/hooks/useUser";
import { FaUserAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import usePlayer from "@/hooks/usePlayer";
import { AiOutlinePlus } from "react-icons/ai";
import useSubscribeModal from "@/hooks/useSubscribeModal";
import useUploadModal from "@/hooks/useUploadModal";
import CreatePlaylistButton from "./CreatePlaylistButton";
import { BsThreeDotsVertical } from "react-icons/bs";
import { HiXMark } from "react-icons/hi2";
import usePlaylistModal from "@/hooks/usePlaylistModal";
import { ImHeadphones } from "react-icons/im";

interface HeaderProps {
  children: React.ReactNode;
  className?: string;
}
const Header: React.FC<HeaderProps> = ({ children, className }) => {
  const player = usePlayer();
  const authModal = useAuthModal();
  const router = useRouter();
  const subscribeModal = useSubscribeModal();
  const uploadModal = useUploadModal();
  const { user, subscription } = useUser();
  const supabaseClient = useSupabaseClient();
  const [isOpen, setIsOpen] = useState(false);
  const playlistModal = usePlaylistModal();

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    player.reset();
    router.refresh();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged Out!");
    }
  };

  const onClick = () => {
    setIsOpen(false);
    if (!user) {
      return authModal.onOpen();
    }

    if (!subscription) {
      return subscribeModal.onOpen();
    }
    return uploadModal.onOpen();
  };

  const createPlaylist = () => {
    setIsOpen(false);
    playlistModal.onOpen();
  };

  const handleExplore = () => {
    playlistModal.onClose()
    router.push('/all');
  }

  return (
    <div
      className={twMerge(
        `h-fit css-selector`,
        className
      )}
    >
      <div className="p-6 h-fit bg-gradient-to-t from-[#171717]">

      <div className="w-full mb-4 flex items-center justify-between">
        <div className="hidden md:flex gap-x-2 items-center">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-black flex items-center justify-center hover:opacity-75 transition"
          >
            <RxCaretLeft size={35} className="text-white" />
          </button>
          <button
            onClick={() => router.forward()}
            className="rounded-full bg-black flex items-center justify-center hover:opacity-75 transition"
          >
            <RxCaretRight size={35} className="text-white" />
          </button>
        </div>
        <div className="flex md:hidden gap-x-2 items-center">
          <button
            onClick={() => router.push("/")}
            className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75"
          >
            <HiHome size={20} className="text-black" />
          </button>
          <button
            onClick={() => router.push("/search")}
            className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75"
          >
            <BiSearch size={20} className="text-black" />
          </button>
          <button
            onClick={() => router.push("/music-room")}
            className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75"
          >
            <ImHeadphones size={20} className="text-black" />
          </button>
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full p-2 bg-white text-black flex items-center justify-center hover:opacity-75"
              >
                {isOpen ? (
                  <HiXMark size={20} />
                ) : (
                  <BsThreeDotsVertical size={20} />
                )}
              </button>
              <div
                className={`flex justify-center items-start flex-col gap-2 bg-neutral-200 p-2 rounded-lg text-black z-20 absolute w-[150px] mt-2 transition-all duration-300 ${
                  isOpen ? "h-[120px] opacity-100" : "h-0 opacity-0"
                }`}
              >
                {isOpen && 
                <>
                <p className="font-semibold cursor-pointer" onClick={onClick}>
                  Add to Library
                </p>
                <div className="bg-neutral-600 h-px w-[130px] py-[0.3px]"/>
                <p className="font-semibold cursor-pointer" onClick={createPlaylist}>
                  Create a Playlist
                </p>
                <div className="bg-neutral-600 h-px w-[130px] py-[0.3px]"/>
                <p className="font-semibold cursor-pointer" onClick={handleExplore}>
                  Explore All Songs
                </p>
                </>
                  }
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end w-full gap-x-4">
          {user ? (
            <>
              <CreatePlaylistButton />
              <div className="flex gap-x-4 items-center justify-end w-fit">
                <Button onClick={handleLogout} className="bg-white w-fit px-6 py-2">
                  Logout
                </Button>
                <button
                  onClick={() => router.push("/account")}
                  className="flex rounded-full bg-white w-10 h-10 overflow-hidden"
                >
                  {user.user_metadata.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ):(
                    <FaUserAlt />
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Button
                  onClick={authModal.onOpen}
                  className="bg-transparent text-neutral-300 font-medium"
                >
                  Sign Up
                </Button>
              </div>
              <div>
                <Button
                  onClick={authModal.onOpen}
                  className="bg-white px-6 py-2"
                >
                  Log In
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {children}
      </div>
    </div>
  );
};

export default Header;
