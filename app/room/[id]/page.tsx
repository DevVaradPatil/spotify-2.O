"use client";
import { useUser } from "@/hooks/useUser";
import useAuthModal from "@/hooks/useAuthModel";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Song } from "@/types";
import SearchContent from "@/app/search/components/SearchContent";
import debounce from "lodash.debounce";
import Chat from "./components/Chat";
import usePlayer from "@/hooks/usePlayer";
import useRoomSocket from "@/hooks/useRoomSocket";

const Room = () => {
  const pathname = usePathname();
  const roomCode = (pathname!.split("/").pop() || "").toUpperCase();
  const { user } = useUser();
  const authModal = useAuthModal();
  const [activeTab, setActiveTab] = useState("songs");
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const player = usePlayer();

  const { send, subscribe, status } = useRoomSocket(roomCode);

  // Tracks the last id we either broadcast or received, so an incoming
  // PLAY_SONG does not immediately echo back out again.
  const lastBroadcastId = useRef<string | undefined>(player.activeId);

  useEffect(() => {
    if (!user) {
      authModal.onOpen();
    }
  }, [user, authModal]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string, signal: AbortSignal) => {
        if (query.length < 2) return;
        try {
          const response = await fetch(
            `/api/songs?title=${encodeURIComponent(query)}`,
            { signal }
          );
          if (!response.ok) return;
          setSongs(await response.json());
        } catch {
          // aborted or network error — nothing to show
        }
      }, 400),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    debouncedSearch(searchQuery, controller.signal);
    return () => {
      controller.abort();
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "PLAY_SONG") {
        const songId = String(message.songId);
        lastBroadcastId.current = songId;
        player.setId(songId);
        player.setIds([songId]);
      }
    });
  }, [subscribe, player]);

  useEffect(() => {
    if (!player.activeId) return;
    if (player.activeId === lastBroadcastId.current) return;
    lastBroadcastId.current = player.activeId;
    send({ type: "PLAY_SONG", songId: player.activeId });
  }, [player.activeId, send]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-neutral-900 rounded-lg p-2 flex flex-col justify-start items-center md:p-6 h-full w-full overflow-hidden relative">
      <div className="absolute top-2 right-2 flex items-center gap-x-2 text-white opacity-50 z-50">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "open"
              ? "bg-green-500"
              : status === "connecting"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        <span className="sr-only">
          {status === "open" ? "Connected to room" : "Not connected"}
        </span>
        {roomCode}
      </div>
      <div className="flex fixed top-5 my-2 z-20 w-[90%] max-w-xl overflow-hidden bg-black rounded-full justify-evenly items-center">
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
      <div className="flex flex-col pt-[8vh] w-full h-full">
        {activeTab === "songs" && (
          <div className="flex flex-col w-full px-5">
            <label htmlFor="room-song-search" className="sr-only">
              Search for songs
            </label>
            <input
              id="room-song-search"
              className="flex w-full rounded-md bg-neutral-700 border border-transparent px-3 py-3 text-sm placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 mb-10"
              placeholder="Search for songs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchContent songs={songs} />
          </div>
        )}
        {activeTab === "chat" && (
          <Chat send={send} subscribe={subscribe} />
        )}
      </div>
    </div>
  );
};

export default Room;
