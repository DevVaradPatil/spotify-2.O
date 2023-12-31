import React from "react";
import usePlaylistModal from "@/hooks/usePlaylistModal";
import { AiOutlinePlus } from "react-icons/ai";

const CreatePlaylistButton = () => {
  const playlistModal = usePlaylistModal();

  const onClick = () => {
    playlistModal.onOpen();
  };

  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hidden md:flex text-lg hover:bg-blue-700 transition text-white justify-center items-center gap-2 font-bold py-2 px-4 rounded-full"
    >
      <AiOutlinePlus size={24} /> Playlist
    </button>
  );
};

export default CreatePlaylistButton;
