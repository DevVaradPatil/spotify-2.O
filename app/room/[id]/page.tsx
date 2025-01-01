"use client";
import Player from "@/components/Player";
import { useUser } from "@/hooks/useUser";
import useAuthModal from "@/hooks/useAuthModel";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Song } from "@/types";
import SearchContent from "@/app/search/components/SearchContent";
import debounce from "lodash.debounce";
import Chat from "./components/Chat";
import usePlayer from "@/hooks/usePlayer";

const Room = () => {
  const pathname = usePathname();
  const roomCode = pathname!.split("/").pop() || "";
  const { user } = useUser();
  const authModal = useAuthModal();
  const [activeTab, setActiveTab] = useState("songs");
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const player = usePlayer();
  const wsRef = useRef<WebSocket | null>(null);
  const [lastPlayedSongId, setLastPlayedSongId] = useState(player.activeId || "");

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

  const connectWebSocket = () => {
    const ws = new WebSocket(`wss://spotify-backend-r813.onrender.com/${roomCode}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      console.log("Received message:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === "PLAY_SONG") {
          player.setId(data.songId);
          player.setIds([data.songId]);
        } else if (data.type === "PAUSE_SONG") {
          player.setIsPlaying(false);
        } else if (data.type === "PLAY_SONG") {
          player.setIsPlaying(true);
        } else if (data.type === "UPDATE_POSITION") {
          player.setSoundPosition(data.position);
        } else if (data.type === "CHAT") {
          // Handle chat message
          console.log("Chat message received:", data.message);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed, reconnecting...");
      setTimeout(connectWebSocket, 1000); // Reconnect after 1 second
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomCode]);

  const handlePlaySong = (songId: string) => {
    const sendMessage = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("Sending message:", { type: "PLAY_SONG", songId });
        wsRef.current.send(JSON.stringify({ type: "PLAY_SONG", songId }));
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        setTimeout(sendMessage, 100); // Retry after 100ms
      } else {
        console.error("WebSocket is not open. Ready state:", wsRef.current?.readyState);
      }
    };

    player.setId(songId);
    player.setIds([songId]);
    sendMessage();
  };

  const handlePauseSong = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "PAUSE_SONG" }));
    }
  };

  const handlePlayerSong = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "PLAY_SONG" }));
    }
  };

  const handleUpdatePosition = (position: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "UPDATE_POSITION", position }));
    }
  };

  useEffect(() => {
    if (player.activeId && player.activeId !== lastPlayedSongId) {
      setLastPlayedSongId(player.activeId);
      handlePlaySong(player.activeId);
    }
  }, [player.activeId, lastPlayedSongId]);

  // useEffect(() => {
  //   if (player.activeId) {
  //     if (player.isPlaying) {
  //       handlePlayerSong();
  //     } else {
  //       handlePauseSong();
  //     }
  //     handleUpdatePosition(player.soundPosition);
  //   }
  // }, [player.isPlaying, player.soundPosition]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-neutral-900 rounded-lg p-2 md:p-6 h-full w-full overflow-hidden  relative">
      <div className="absolute top-2 right-2 text-white opacity-50">{roomCode}</div>
      <div className="flex my-2 w-full overflow-hidden bg-black rounded-full justify-evenly items-center">
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
            <Chat roomCode={roomCode} socket={wsRef.current} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
