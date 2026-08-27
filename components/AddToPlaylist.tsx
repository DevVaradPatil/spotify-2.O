import { useUser } from "@/hooks/useUser";
import { Playlist } from "@/types";
import { useSupabaseClient } from "@/hooks/useSupabase";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
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

    try {
      // A single targeted row per membership change, instead of reading the
      // whole song_ids array, splicing it and writing it back. That
      // read-modify-write meant two concurrent edits silently discarded one
      // another, and it was also where the string/number id mismatch made
      // indexOf never match.
      const { data: existing, error: lookupError } = await supabaseClient
        .from("playlist_songs")
        .select("song_id")
        .eq("playlist_id", playlistId)
        .eq("song_id", songId)
        .maybeSingle();

      if (lookupError) {
        toast.error(lookupError.message);
        return;
      }

      if (existing) {
        const { error } = await supabaseClient
          .from("playlist_songs")
          .delete()
          .eq("playlist_id", playlistId)
          .eq("song_id", songId);

        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Song removed from playlist");
      } else {
        // Append: one past the current highest position.
        const { data: last } = await supabaseClient
          .from("playlist_songs")
          .select("position")
          .eq("playlist_id", playlistId)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error } = await supabaseClient.from("playlist_songs").insert({
          playlist_id: playlistId,
          song_id: songId,
          position: (last?.position ?? -1) + 1,
        });

        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Song added to playlist");
      }

      setMembership((prev) => {
        const next = new Set(prev);
        if (existing) next.delete(playlistId);
        else next.add(playlistId);
        return next;
      });
      setIsModalOpen(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
      setIsModalOpen(false);
    }
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
                            alt="playlist"
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <span className="mr-2">{playlist.name}</span>
                      </div>
                      <button
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className=" bg-accent hover:bg-accent-hover text-white p-1 rounded-full cursor-pointer"
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
