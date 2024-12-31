"use client";
import { useState } from "react";
import useAuthModal from "@/hooks/useAuthModel";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { IoIosRocket } from "react-icons/io";

const MusicRoom = () => {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();
  const { user } = useUser();
  const authModal = useAuthModal();

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode}`);
    }
  };

  const onClick = () => {
    if (user) {
      handleJoinRoom();
    } else {
      authModal.onOpen();
    }
  };

  return (
    <div className="flex flex-col bg-neutral-900 items-center justify-center h-full rounded-lg p-6">
      <div className="flex flex-col justify-center items-center w-full max-w-2xl">
        <h1 className="text-3xl font-extrabold text-white mb-6">
          Enter Room Code
        </h1>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Eg. FQPOS7"
          className="p-3 border border-gray-300 rounded mb-4 w-full max-w-md text-gray-100"
        />
        <button
          onClick={onClick}
          className="bg-green-500 text-white text-lg px-6 py-3 rounded-full hover:bg-green-600 transition flex items-center gap-2"
        >
          Join Room
          <IoIosRocket fontSize={22} />
        </button>
      </div>
    </div>
  );
};

export default MusicRoom;
