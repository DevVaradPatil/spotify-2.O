"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "./useUser";

export type RoomMessage =
  | { type: "AUTH_OK" }
  | { type: "PLAY_SONG"; songId: string }
  | {
      type: "CHAT";
      email: string;
      content: string;
      full_name: string | null;
      avatar_url: string | null;
    };

type Listener = (message: RoomMessage) => void;

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL;

/**
 * One authenticated socket per room member.
 *
 * Previously the room page and Chat each opened their own unauthenticated
 * connection to a hardcoded endpoint, so every member held two sockets and
 * the server had no idea who they were.
 */
const useRoomSocket = (roomCode: string) => {
  const { accessToken } = useUser();
  const socketRef = useRef<WebSocket | null>(null);
  const listeners = useRef(new Set<Listener>());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!roomCode || !accessToken) return;

    if (!WS_BASE) {
      console.error(
        "NEXT_PUBLIC_WS_URL is not set — the music room cannot connect."
      );
      return;
    }

    closedByUs.current = false;

    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(`${WS_BASE}/${roomCode}`);
      socketRef.current = socket;

      socket.onopen = () => {
        // The server closes the socket unless a valid AUTH frame arrives
        // first. The token is sent in the body rather than the URL so it
        // does not end up in proxy or access logs.
        socket.send(JSON.stringify({ type: "AUTH", token: accessToken }));
      };

      socket.onmessage = (event) => {
        let message: RoomMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "AUTH_OK") setStatus("open");
        listeners.current.forEach((listener) => listener(message));
      };

      socket.onerror = () => {
        // onclose always follows; reconnect is handled there.
      };

      socket.onclose = (event) => {
        setStatus("closed");
        socketRef.current = null;
        // 4401/4400 are our own auth/validation rejections — retrying with
        // the same token would just loop.
        if (closedByUs.current || event.code === 4401 || event.code === 4400) {
          return;
        }
        reconnectTimer.current = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomCode, accessToken]);

  return { send, subscribe, status };
};

export default useRoomSocket;
