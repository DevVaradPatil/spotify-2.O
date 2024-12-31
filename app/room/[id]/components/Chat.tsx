"use client";
import { useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import { IoSend } from "react-icons/io5";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface ChatProps {
  roomCode: string;
  socket: WebSocket | null;
}

const Chat: React.FC<ChatProps> = ({ roomCode, socket }) => {
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { email: string; content: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(messages.map((message: any) => ({
          email: message.email,
          content: message.content
        })));
      }
    };

    fetchMessages();
  }, [roomCode]);

  useEffect(() => {
      socket = new WebSocket(`wss://spotify-backend-r813.onrender.com/?roomCode=${roomCode}`);

      socket.onopen = () => {
        console.log("WebSocket connection opened");
      };

      socket.onmessage = async (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        const { email, content } = data;

        // Append the received message to the messages array
        setMessages((prevMessages) => [...prevMessages, { email, content }]);
      };

      return () => {
        if (socket) {
          socket.close();
        }
      };
    
  }, [roomCode, socket]);

  useEffect(() => {
    // Scroll to the bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (message.length > 0) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const trimmedMessage = message.trim();
        if (trimmedMessage && user?.email) {
          // Send the message via WebSocket
          socket.send(
            JSON.stringify({ type: "CHAT", email: user.email, content: trimmedMessage })
          );

          // Clear the input field
          setMessage("");
        }
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between overflow-y-auto">
      <div className="overflow-y-scroll justify-end h-[75vh] flex items-end w-full">
        <ul className="space-y-2 w-full overflow-y-scroll h-full flex flex-col">
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
                className={`block text-xs text-gray-400 ${
                  msg.email === user?.email ? "text-right" : "text-left"
                }`}
              >
                {msg.email && (
                  <>
                    {msg.email.slice(0, 5)}
                  </>
                )}
              </span>
              {msg.content}
            </li>
          ))}
          <div ref={messagesEndRef} />
        </ul>
      </div>
      <div className="flex absolute left-0 bottom-0 w-full items-center p-1 px-5 mb-3">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message"
          className="flex-grow mr-2 rounded-md p-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-md"
          disabled={message.trim().length === 0}
        >
          <IoSend fontSize={20} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
