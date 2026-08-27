"use client";
import { useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import { IoSend } from "react-icons/io5";
import { useUser } from "@/hooks/useUser";
import { MAX_CHAT_LENGTH, type ChatMessage } from "@/hooks/useRoomChannel";

interface ChatProps {
  messages: ChatMessage[];
  sendChat: (content: string) => Promise<boolean>;
}

/**
 * Chat is now a presentational component. History, delivery and persistence
 * all live in useRoomChannel via Supabase Realtime — this no longer opens a
 * socket or a Supabase client of its own.
 */
const Chat: React.FC<ChatProps> = ({ messages, sendChat }) => {
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const ok = await sendChat(trimmed);
    if (ok) setMessage("");
    setSending(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full relative flex-col overflow-y-scroll pb-12 justify-center flex items-center w-full">
      <ul
        className="space-y-2 w-full overflow-y-scroll h-full flex flex-col"
        aria-live="polite"
        aria-label="Room chat messages"
      >
        {messages.length === 0 && (
          <li className="text-neutral-300 text-sm m-auto">
            No messages yet — say something.
          </li>
        )}
        {messages.map((msg) => {
          const isMine = msg.user_id === user?.id;
          return (
            <li
              key={msg.id}
              className={`p-2 rounded-md max-w-[90%] break-words ${
                isMine
                  ? "bg-blue-600 text-white self-end"
                  : "bg-neutral-800 text-white self-start text-left"
              }`}
            >
              <span
                className={`block text-xs text-neutral-300 ${
                  isMine ? "text-right" : "text-left"
                }`}
              >
                {isMine ? "You" : (msg.full_name?.split(" ")[0] ?? "Someone")}
              </span>
              {msg.content}
            </li>
          );
        })}
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
          disabled={sending}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="flex-grow mr-2 rounded-md p-2"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white p-2 rounded-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          disabled={sending || message.trim().length === 0}
          aria-label="Send message"
        >
          <IoSend fontSize={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default Chat;
