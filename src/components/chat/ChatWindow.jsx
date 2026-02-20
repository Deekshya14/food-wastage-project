// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";

export default function ChatWindow({ socket, partnerId, token, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    // FIX: prevent 400 Bad Request by checking if partnerId is valid
    if (!partnerId || partnerId === "undefined") return;

    // 1. Fetch History
    fetch(`http://localhost:5000/api/messages/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("History fetch failed");
        return res.json();
      })
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(err => console.error("Chat History Error:", err));

    // 2. Join Socket Room
    if (socket && currentUser?._id) {
      socket.emit("joinChat", { userId: currentUser._id, partnerId });
      
      const handleMessage = (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
      };

      socket.on("receiveMessage", handleMessage);
      
      return () => socket.off("receiveMessage", handleMessage);
    }
  }, [partnerId, socket, currentUser?._id, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !partnerId) return;

    const messageData = { receiverId: partnerId, text };

    try {
      const res = await fetch(`http://localhost:5000/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });
      
      const savedMsg = await res.json();
      
      if (socket) {
        socket.emit("sendMessage", savedMsg);
      }
      
      setMessages((prev) => [...prev, savedMsg]);
      setText("");
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  // If no partner is selected yet, show a placeholder instead of an empty window
  if (!partnerId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 font-medium">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => {
          // Robust isMe check
          const senderId = m.sender?._id || m.sender;
          const isMe = senderId === currentUser?._id;
          
          return (
            <div key={m._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-4 rounded-[1.5rem] shadow-sm text-sm font-medium ${
                isMe ? "bg-slate-900 text-white rounded-br-none" : "bg-white text-slate-700 rounded-bl-none"
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-slate-900 transition-colors shadow-lg shadow-blue-100">
          <FaPaperPlane size={14} />
        </button>
      </form>
    </div>
  );
}