"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useUser } from "./useUser";

export interface ChatMessage {
  id: number | string;
  user_id: string | null;
  content: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type RoomStatus = "connecting" | "open" | "closed";

const HISTORY_LIMIT = 200;
export const MAX_CHAT_LENGTH = 2000;

/**
 * Music rooms over Supabase Realtime.
 *
 * This replaces the standalone `ws` server that used to run on Render. Vercel
 * cannot host a long-lived socket server on any runtime, so that process was
 * the only reason the project needed a second host. Realtime is already part
 * of the Supabase project, so the room feature is preserved in full.
 *
 * - Track changes go over an ephemeral broadcast channel (no persistence
 *   needed — a late joiner does not care what played a minute ago).
 * - Chat is inserted into `public.messages` and arrives via a
 *   postgres_changes subscription, so persistence and delivery are the same
 *   mechanism. RLS enforces `auth.uid() = user_id` on insert, which is what
 *   makes the impersonation the old server allowed impossible.
 * - Presence gives an accurate listener count for free.
 */
const useRoomChannel = (roomCode: string) => {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<RoomStatus>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listeners, setListeners] = useState(1);

  const onPlaySong = useRef<((songId: string) => void) | null>(null);
  const setOnPlaySong = useCallback((handler: (songId: string) => void) => {
    onPlaySong.current = handler;
  }, []);

  // ---- history -----------------------------------------------------------
  useEffect(() => {
    if (!roomCode || !user) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, content, full_name, avatar_url, created_at")
        .eq("room_code", roomCode)
        .order("created_at", { ascending: true })
        .limit(HISTORY_LIMIT);

      if (!cancelled && !error && data) {
        setMessages(data as ChatMessage[]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode, user, supabase]);

  // ---- channel -----------------------------------------------------------
  useEffect(() => {
    if (!roomCode || !user) return;

    const channel = supabase
      .channel(`room:${roomCode}`, {
        config: { presence: { key: user.id } },
      })
      .on("broadcast", { event: "PLAY_SONG" }, ({ payload }) => {
        const songId = payload?.songId;
        if (songId != null) onPlaySong.current?.(String(songId));
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_code=eq.${roomCode}`,
        },
        ({ new: row }) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (row as ChatMessage).id)
              ? prev
              : [...prev, row as ChatMessage]
          );
        }
      )
      .on("presence", { event: "sync" }, () => {
        setListeners(Object.keys(channel.presenceState()).length || 1);
      });

    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") {
        setStatus("open");
        channel.track({ online_at: new Date().toISOString() });
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
        setStatus("closed");
      } else {
        setStatus("connecting");
      }
    });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      setStatus("closed");
    };
  }, [roomCode, user, supabase]);

  // ---- actions -----------------------------------------------------------
  const broadcastSong = useCallback((songId: string) => {
    const channel = channelRef.current;
    if (!channel) return false;
    channel.send({ type: "broadcast", event: "PLAY_SONG", payload: { songId } });
    return true;
  }, []);

  const sendChat = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > MAX_CHAT_LENGTH || !user) return false;

      // user_id is what RLS checks. full_name / avatar_url are convenience
      // copies for rendering; they can no longer be used to pose as somebody
      // else because the row is bound to the caller's verified id.
      const { error } = await supabase.from("messages").insert({
        room_code: roomCode,
        user_id: user.id,
        content: trimmed,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });

      return !error;
    },
    [roomCode, user, supabase]
  );

  return { status, messages, listeners, sendChat, broadcastSong, setOnPlaySong };
};

export default useRoomChannel;
