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
import { getPlaybackPosition } from "@/libs/playbackClock";
import useRoomChannel from "@/hooks/useRoomChannel";

const Room = () => {
  const pathname = usePathname();
  const roomCode = (pathname!.split("/").pop() || "").toUpperCase();
  const { user } = useUser();
  const authModal = useAuthModal();
  const [activeTab, setActiveTab] = useState<"songs" | "chat">("songs");
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const activeId = usePlayer((state) => state.activeId);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const setId = usePlayer((state) => state.setId);
  const setIds = usePlayer((state) => state.setIds);
  const setIsPlaying = usePlayer((state) => state.setIsPlaying);
  const requestSeek = usePlayer((state) => state.requestSeek);

  const {
    status,
    messages,
    listeners,
    sendChat,
    broadcastSong,
    broadcastPlayback,
    setOnPlaySong,
    setOnPlayback,
  } = useRoomChannel(roomCode);

  // Guards against echoing a track back out after receiving it.
  const lastSyncedId = useRef<number | undefined>(activeId);
  // Same guard for play/pause: applying a remote state change must not
  // immediately rebroadcast it and ping-pong around the room.
  const isApplyingRemote = useRef(false);
  const lastSentIsPlaying = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user) authModal.onOpen();
  }, [user, authModal]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string, signal: AbortSignal) => {
        if (query.trim().length < 2) return;
        try {
          const response = await fetch(
            `/api/songs?title=${encodeURIComponent(query)}`,
            { signal }
          );
          if (response.ok) setSongs(await response.json());
        } catch {
          // aborted or offline
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
    setOnPlaySong((songId) => {
      lastSyncedId.current = songId;
      setId(songId);
      setIds([songId]);
    });
  }, [setOnPlaySong, setId, setIds]);

  useEffect(() => {
    if (!activeId || activeId === lastSyncedId.current) return;
    lastSyncedId.current = activeId;
    broadcastSong(activeId);
  }, [activeId, broadcastSong]);

  useEffect(() => {
    setOnPlayback(({ isPlaying: remotePlaying, position }) => {
      isApplyingRemote.current = true;
      lastSentIsPlaying.current = remotePlaying;
      requestSeek(position);
      setIsPlaying(remotePlaying);
      // Released after the state settles, so the effect below sees the flag.
      setTimeout(() => {
        isApplyingRemote.current = false;
      }, 0);
    });
  }, [setOnPlayback, requestSeek, setIsPlaying]);

  useEffect(() => {
    if (!activeId) return;
    if (isApplyingRemote.current) return;
    if (lastSentIsPlaying.current === isPlaying) return;

    lastSentIsPlaying.current = isPlaying;
    // Position is read from the non-reactive clock rather than the store, so
    // the player does not have to publish a value that ticks twice a second.
    broadcastPlayback(isPlaying, getPlaybackPosition());
  }, [isPlaying, activeId, broadcastPlayback]);

  if (!user) return null;

  const statusLabel =
    status === "open"
      ? `Connected · ${listeners} listening`
      : status === "connecting"
        ? "Connecting…"
        : "Disconnected";

  return (
    <div className="bg-surface rounded-lg p-2 flex flex-col justify-start items-center md:p-6 h-full w-full overflow-hidden relative">
      <div className="absolute top-2 right-2 flex items-center gap-x-2 text-white/60 z-50 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "open"
              ? "bg-accent"
              : status === "connecting"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        <span className="sr-only" role="status">
          {statusLabel}
        </span>
        <span aria-hidden="true">{listeners}</span>
        <span className="font-mono tracking-widest">{roomCode}</span>
      </div>

      <div
        className="flex fixed top-5 my-2 z-20 w-[90%] max-w-xl overflow-hidden bg-black rounded-full justify-evenly items-center"
        role="tablist"
        aria-label="Room sections"
      >
        {(["songs", "chat"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`room-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`w-full py-3 flex items-center px-5 justify-center capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              activeTab === tab ? "bg-surface-hover" : ""
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col pt-[8vh] w-full h-full">
        {activeTab === "songs" && (
          <div
            id="room-panel-songs"
            role="tabpanel"
            className="flex flex-col w-full px-5"
          >
            <label htmlFor="room-song-search" className="sr-only">
              Search for songs
            </label>
            <input
              id="room-song-search"
              className="flex w-full rounded-md bg-surface-hover border border-transparent px-3 py-3 text-sm placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent mb-10"
              placeholder="Search for songs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchContent songs={songs} />
          </div>
        )}
        {activeTab === "chat" && (
          <div id="room-panel-chat" role="tabpanel" className="h-full w-full">
            <Chat messages={messages} sendChat={sendChat} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
