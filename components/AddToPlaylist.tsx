import { useUser } from "@/hooks/useUser";
import { Playlist } from "@/types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  AiOutlineCheck,
  AiOutlinePlus,
  AiTwotoneCheckCircle,
  AiTwotonePlusCircle,
} from "react-icons/ai";
import { MdPlaylistAdd } from "react-icons/md";

interface AddToPlaylistProps {
  songId: string | undefined;
}

const AddToPlaylist: React.FC<AddToPlaylistProps> = ({ songId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]); // Assuming playlists is an array of user playlists
  const supabaseClient = useSupabaseClient();
  const { user } = useUser();

  const openModal = async () => {
    setIsModalOpen(true);
    const fetchPlaylists = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("playlists")
          .select("*")
          .eq("user_id", user?.id);
        if (error) {
          toast.error(error.message);
        } else if (data && Array.isArray(data)) {
          setPlaylists(data);
        }
      } catch (error) {
        toast.error("Error Fetching Playlists");
      }
    };
    fetchPlaylists();
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      // Fetch the playlist from the 'playlists' table
      const { data: playlistsData, error } = await supabaseClient
        .from("playlists")
        .select("*")
        .eq("id", playlistId);

      if (error) {
        toast.error("Error fetching playlist");
        return;
      }

      if (playlistsData.length === 0) {
        toast.error("Playlist not found");
        return;
      }

      const playlist = playlistsData[0];
      let songsIds = playlist.song_ids || [];

      // Check if the songId is already in the playlist
      const songIndex = songsIds.indexOf(songId);

      if (songIndex !== -1) {
        // Song is already in the playlist, so remove it
        songsIds.splice(songIndex, 1);
        toast.success("Song removed from playlist");
      } else {
        // Song is not in the playlist, add it
        songsIds.push(songId);
        toast.success("Song added to playlist");
      }

      // Update the playlist with the modified 'songs_ids' array
      const { error: updateError } = await supabaseClient
        .from("playlists")
        .update({ song_ids: songsIds })
        .eq("id", playlistId);

      setIsModalOpen(false);

      if (updateError) {
        toast.error("Error updating playlist" + updateError.message);
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error("An error occurred");
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div
        className="mr-2 hover:text-neutral-400 cursor-pointer"
        onClick={openModal}
      >
        <MdPlaylistAdd size={30} />
      </div>

      {isModalOpen && (
        <div className="centered-modal">
          <div className="bg-neutral-800 rounded-md p-3 w-[90%]  md:max-w-[350px] text-center">
            <div className="modal-content">
              <h2 className="text-white text-xl font-semibold mb-4">
                Select Playlists
              </h2>
              <ul className="flex flex-col gap-3">
                {playlists.map((playlist) => {
                  const { data: imageData } = supabaseClient.storage
                    .from("images")
                    .getPublicUrl(playlist.image_path);
                  let isAdded = playlist.song_ids.includes(songId!);

                  return (
                    <li
                      key={playlist.id}
                      className="text-white w-full flex justify-between items-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative rounded-md min-h-[48px] min-w-[48px] overflow-hidden">
                          <Image
                            src={imageData.publicUrl}
                            alt="playlist"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="mr-2">{playlist.name}</span>
                      </div>
                      <button
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className=" bg-green-500 hover:bg-green-600 text-white p-1 rounded-full cursor-pointer"
                      >
                        {isAdded ? (
                          <AiOutlineCheck size={20} />
                        ) : (
                          <AiOutlinePlus size={20} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={closeModal}
                className="mt-5 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddToPlaylist;
