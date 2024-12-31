"use client";

import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { Song } from "@/types";
import SearchContent from "@/app/search/components/SearchContent";
import usePlayer from "@/hooks/usePlayer";

interface SongComponentProps {
  roomCode: string;
}

const SongComponent: React.FC<SongComponentProps> = ({ roomCode }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const player = usePlayer();
  const wsRef = useRef<WebSocket | null>(null);

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
    const ws = new WebSocket(`wss://spotify-backend-r813.onrender.com/?roomCode=${roomCode}`);
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

  return (
    <div>
      <input
        className="flex w-full rounded-md bg-neutral-700 border border-transparent px-3 py-3 text-sm file:border-0 file:bg-transparent file:text-sm placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none mb-10"
        placeholder="Search for songs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <SearchContent songs={songs} />
    </div>
  );
};

export default SongComponent;
