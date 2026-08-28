import { useUser } from "@/hooks/useUser";
import { Playlist } from "@/types";
import { useSupabaseClient } from "@/hooks/useSupabase";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePlaylistSong } from "@/actions/mutations";
import toast from "react-hot-toast";
import {
  AiOutlineCheck,
  AiOutlinePlus,
  AiTwotoneCheckCircle,
  AiTwotonePlusCircle,
} from "react-icons/ai";
import { MdPlaylistAdd } from "react-icons/md";

interface AddToPlaylistProps {
  songId: number | undefined;
}

const AddToPlaylist: React.FC<AddToPlaylistProps> = ({ songId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // Which playlists already contain this song. Read from playlist_songs on
  // open rather than inferred from an array column on each playlist row.
  const [membership, setMembership] = useState<Set<number>>(new Set());
  const supabaseClient = useSupabaseClient();
  const { user } = useUser();
  const router = useRouter();

  const openModal = async () => {
    setIsModalOpen(true);
    if (!user || songId === undefined) return;

    try {
      const [{ data: playlistData, error }, { data: memberRows }] = await Promise.all([
        supabaseClient.from("playlists").select("*").eq("user_id", user.id),
        supabaseClient
          .from("playlist_songs")
          .select("playlist_id")
          .eq("song_id", songId),
      ]);

      if (error) {
        toast.error(error.message);
        return;
      }

      setPlaylists(playlistData ?? []);
      setMembership(new Set((memberRows ?? []).map((row) => row.playlist_id)));
    } catch {
      toast.error("Error Fetching Playlists");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (songId === undefined) return;

    // Ownership, existence and ordering are all decided server-side now. The
    // browser previously did a read, a branch and a write of its own, none of
    // which anything but RLS was checking.
    const result = await togglePlaylistSong(playlistId, songId);

    if ("error" in result) {
      toast.error(result.error);
      setIsModalOpen(false);
      return;
    }

    setMembership((prev) => {
      const next = new Set(prev);
      if (result.added) next.add(playlistId);
      else next.delete(playlistId);
      return next;
    });

    toast.success(
      result.added ? "Song added to playlist" : "Song removed from playlist"
    );
    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        className="mr-2 hover:text-content-muted cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={openModal}
        aria-label="Add to playlist"
      >
        <MdPlaylistAdd size={30} aria-hidden="true" />
      </button>

      {isModalOpen && (
        <div className="centered-modal">
          <div className="bg-surface-raised rounded-md p-3 w-[90%]  md:max-w-[350px] text-center">
            <div className="modal-content">
              <h2 className="text-white text-xl font-semibold mb-4">
                Select Playlists
              </h2>
              <ul className="flex flex-col gap-3">
                {playlists.map((playlist) => {
                  const { data: imageData } = supabaseClient.storage
                    .from("images")
                    .getPublicUrl(playlist.image_path ?? "");
                  const isAdded = membership.has(playlist.id);

                  return (
                    <li
                      key={playlist.id}
                      className="text-white w-full flex justify-between items-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative rounded-md min-h-[48px] min-w-[48px] overflow-hidden">
                          <Image
                            src={imageData.publicUrl}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <span className="mr-2">{playlist.name}</span>
                      </div>
                      <button
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        aria-label={
                          isAdded
                            ? `Remove from ${playlist.name}`
                            : `Add to ${playlist.name}`
                        }
                        aria-pressed={isAdded}
                        className=" bg-accent hover:bg-accent-hover text-white p-1 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
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
