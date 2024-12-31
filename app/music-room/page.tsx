"use client";
import { useState } from "react";
import useAuthModal from "@/hooks/useAuthModel";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { IoIosRocket} from "react-icons/io";
import { FaDice } from "react-icons/fa6";

const MusicRoom = () => {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();
  const { user } = useUser();
  const authModal = useAuthModal();

  const handleJoinRoom = () => {
    if (roomCode.trim().length === 6) {
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

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onClick();
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
          onKeyPress={handleKeyPress}
          placeholder="Eg. FQPOS7"
          maxLength={6}
          className="p-3 border border-gray-300 rounded mb-4 w-full max-w-md text-gray-100"
        />
        <div className="flex flex-col gap-4">
          <button
            onClick={onClick}
            className="bg-green-500 justify-center text-white text-lg px-6 py-3 rounded-full hover:bg-green-600 transition flex items-center gap-2"
          >
            Join Room
            <IoIosRocket fontSize={22} />
          </button>
          <button
            onClick={generateRoomCode}
            className="bg-blue-500 justify-center text-white text-lg px-6 py-3 rounded-full hover:bg-blue-600 transition flex items-center gap-2"
          >
            Generate Code
            <FaDice fontSize={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicRoom;
