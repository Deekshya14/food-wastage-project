// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaCheckDouble } from "react-icons/fa";

export default function ChatWindow({ socket, partnerId, token, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const scrollRef = useRef();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!partnerId || partnerId === "undefined") return;

    // 1. Fetch History
    fetch(`http://localhost:5000/api/messages/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(err => console.error("History Error:", err));

    // 2. Socket Listeners
    if (socket && currentUser?._id) {
      socket.emit("joinChat", { userId: currentUser._id, partnerId });
      
      // Listen for new messages
      socket.on("receiveMessage", (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        // When a message is received while chat is open, tell backend it's "seen"
        socket.emit("messageSeen", { messageId: newMessage._id, senderId: partnerId });
      });

      // Listen for Typing
      socket.on("userTyping", ({ userId }) => {
        if (userId === partnerId) {
          setIsPartnerTyping(true);
          // Auto-hide typing after 3 seconds of no activity
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
        }
      });

      socket.on("userStoppedTyping", ({ userId }) => {
        if (userId === partnerId) setIsPartnerTyping(false);
      });

      return () => {
        socket.off("receiveMessage");
        socket.off("userTyping");
        socket.off("userStoppedTyping");
      };
    }
  }, [partnerId, socket, currentUser?._id, token]);

  // Handle Typing Emit
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket && partnerId) {
      socket.emit("typing", { receiverId: partnerId, userId: currentUser._id });
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !partnerId) return;

    const messageData = { receiverId: partnerId, text };
    if (socket) socket.emit("stopTyping", { receiverId: partnerId, userId: currentUser._id });

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
      if (socket) socket.emit("sendMessage", savedMsg);
      setMessages((prev) => [...prev, savedMsg]);
      setText("");
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => {
          const senderId = m.sender?._id || m.sender;
          const isMe = senderId === currentUser?._id;
          
          return (
            <div key={m._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-5 py-4 rounded-[1.8rem] text-[13px] font-bold shadow-sm ${
                  isMe ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none" 
                       : "bg-white text-slate-600 rounded-bl-none border border-slate-100/50"
                }`}>
                {m.text}
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                   <span className="text-[8px] font-black uppercase">
                     {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                   </span>
                   {isMe && <FaCheckDouble size={8} className={m.seen ? "text-blue-300" : "text-white/50"} />}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing Indicator */}
        {isPartnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-[1.2rem] rounded-bl-none shadow-sm border border-slate-100">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div className="px-6 py-8 bg-white/80 backdrop-blur-sm border-t border-slate-50">
        <form onSubmit={handleSend} className="flex gap-3 items-center">
          <input
            value={text}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 bg-slate-100/60 border-none rounded-2xl px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-2 focus:ring-emerald-400/30 outline-none"
          />
          <button type="submit" className="bg-slate-900 text-white p-4.5 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200">
            <FaPaperPlane size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}