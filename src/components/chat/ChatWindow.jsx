// src/components/chat/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../context/UserContext";

export default function ChatWindow({ socket, partnerId, onCloseChat }) {
  const { user, token } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  // Fetch chat history with this partner
  useEffect(() => {
    if (!partnerId) return;
    const fetchMessages = async () => {
      const res = await fetch(
        `http://localhost:5000/api/messages/${partnerId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setMessages(data);
    };
    fetchMessages();
  }, [partnerId, token]);

  // Listen to incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.senderId === partnerId || msg.receiverId === partnerId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receiveMessage", handleMessage);

    return () => socket.off("receiveMessage", handleMessage);
  }, [socket, partnerId]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msgObj = {
      senderId: user._id,
      receiverId: partnerId,
      content: input,
      createdAt: new Date().toISOString(),
    };

    socket.emit("sendMessage", msgObj);
    setMessages((prev) => [...prev, msgObj]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-semibold">Chat</h3>
        <button onClick={onCloseChat} className="text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${
              m.senderId === user._id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs ${
                m.senderId === user._id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              {m.content}
              <div className="text-xs text-gray-400 mt-1 text-right">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex p-3 border-t gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 focus:outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
