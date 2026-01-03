// src/components/ChatModal.jsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useUser } from "../../context/UserContext";
import { FaTimes, FaPaperPlane } from "react-icons/fa";

const API = "http://localhost:5000";

export default function ChatModal({ receiverId, onClose }) {
  const { user, token } = useUser();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Setup socket connection and fetch previous messages
  useEffect(() => {
    if (!receiverId) return;

    const s = io(API);
    setSocket(s);

    // Join room
    const room = `donor_receiver_${receiverId}_${user._id}`;
    s.emit("joinRoom", room);

    // Listen for messages
    s.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Fetch previous messages
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API}/api/messages/${receiverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();

    return () => s.disconnect();
  }, [receiverId, token]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const payload = {
      roomId: `donor_receiver_${receiverId}_${user._id}`,
      receiverId,
      text,
      senderId: user._id,
    };

    socket.emit("sendMessage", payload);
    setMessages((prev) => [...prev, payload]);
    setText("");

    // Save message in backend
    try {
      await fetch(`${API}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId, text }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-full md:w-96 bg-white h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Chat</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => {
            const isSender = m.senderId === user._id;
            return (
              <div
                key={i}
                className={`flex ${isSender ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-2 rounded-xl max-w-[75%] ${
                    isSender ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {m.text}
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <input
            className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-500 rounded-xl text-white hover:bg-blue-600"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}
