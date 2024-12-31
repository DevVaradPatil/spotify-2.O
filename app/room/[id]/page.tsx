"use client";
import Player from "@/components/Player";
import { useUser } from "@/hooks/useUser";
import useAuthModal from "@/hooks/useAuthModel";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Song } from "@/types";
import SearchContent from "@/app/search/components/SearchContent";
import SearchInput from "@/components/SearchInput";
import Chat from "./components/Chat";
import debounce from "lodash.debounce";

const Room = () => {
  const pathname = usePathname();
  const roomCode = pathname!.split("/").pop() || "";
  const { user } = useUser();
  const authModal = useAuthModal();
  const [activeTab, setActiveTab] = useState("songs");
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      authModal.onOpen();
      return;
    }
  }, [user, authModal]);

  const handleSearch = async (query: string) => {
    if (query.length < 2) return;
    const response = await fetch(`/api/songs?title=${query}`);
    const fetchedSongs = await response.json();
    setSongs(fetchedSongs);
  };

  const debouncedSearch = debounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-neutral-900 rounded-lg p-6 h-full w-full overflow-hidden overflow-y-auto relative">
      <div className="absolute top-2 right-2 text-white opacity-50">{roomCode}</div>
      <div className="flex my-5 w-full overflow-hidden bg-black rounded-full justify-evenly items-center">
        <button
          onClick={() => setActiveTab("songs")}
          className={`w-full py-3 flex items-center px-5 justify-center ${activeTab === "songs" ? "bg-neutral-700" : ""}`}
        >
          Songs
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`w-full py-3 flex items-center px-5 justify-center ${activeTab === "chat" ? "bg-neutral-700" : ""}`}
        >
          Chat
        </button>
      </div>
      <div className="flex flex-col">
        {activeTab === "songs" && (
          <div className="flex flex-col w-full">
            <div>
              <input
                className="flex w-full rounded-md bg-neutral-700 border border-transparent px-3 py-3 text-sm file:border-0 file:bg-transparent file:text-sm placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none mb-10"
                placeholder="Search for songs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchContent songs={songs} />
            </div>
          </div>
        )}
        {activeTab === "chat" && (
          <div className="flex flex-col flex-grow">
            <Chat roomCode={roomCode} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
