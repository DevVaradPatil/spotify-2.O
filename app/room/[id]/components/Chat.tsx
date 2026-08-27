"use client";
import { useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import { IoSend } from "react-icons/io5";
import { useUser } from "@/hooks/useUser";
import type { RoomMessage } from "@/hooks/useRoomSocket";

interface ChatMessage {
  email: string;
  content: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ChatProps {
  send: (payload: Record<string, unknown>) => boolean;
  subscribe: (listener: (message: RoomMessage) => void) => () => void;
}

const MAX_CHAT_LENGTH = 2000;

/**
 * Chat no longer opens its own socket or its own Supabase client. It shares
 * the authenticated room socket, and history arrives as a replay from the
 * server on connect rather than a second direct query with the anon key.
 */
const Chat: React.FC<ChatProps> = ({ send, subscribe }) => {
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribe((incoming) => {
      if (incoming.type !== "CHAT") return;
      setMessages((prev) => [
        ...prev,
        {
          email: incoming.email,
          content: incoming.content,
          full_name: incoming.full_name,
          avatar_url: incoming.avatar_url,
        },
      ]);
    });
  }, [subscribe]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > MAX_CHAT_LENGTH) return;
    // The server derives identity from the verified session; we only send
    // the content.
    if (send({ type: "CHAT", content: trimmed })) {
      setMessage("");
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="h-full relative flex-col overflow-y-scroll pb-12 justify-center flex items-center w-full">
      <ul
        className="space-y-2 w-full overflow-y-scroll h-full flex flex-col"
        aria-live="polite"
        aria-label="Room chat messages"
      >
        {messages.map((msg, index) => (
          <li
            key={index}
            className={`p-2 rounded-md max-w-[90%] break-words ${
              msg.email === user?.email
                ? "bg-blue-500 text-white self-end"
                : "bg-neutral-800 text-white self-start text-left"
            }`}
          >
            <span
              className={`block text-xs text-neutral-300 ${
                msg.email === user?.email ? "text-right" : "text-left"
              }`}
            >
              {msg.full_name && <>{msg.full_name.split(" ")[0]}</>}
            </span>
            {msg.content}
          </li>
        ))}
        <div ref={messagesEndRef} />
      </ul>
      <div className="flex w-full absolute bottom-0 justify-center items-center p-1 px-5">
        <label htmlFor="room-chat-input" className="sr-only">
          Type a message
        </label>
        <Input
          id="room-chat-input"
          type="text"
          value={message}
          maxLength={MAX_CHAT_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message"
          className="flex-grow mr-2 rounded-md p-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-md disabled:opacity-50"
          disabled={message.trim().length === 0}
          aria-label="Send message"
        >
          <IoSend fontSize={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default Chat;
