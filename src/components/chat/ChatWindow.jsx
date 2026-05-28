import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaCheckDouble, FaBan, FaRegSmile } from "react-icons/fa";

// Available reactions for messages
const REACTION_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export default function ChatWindow({ socket, partnerId, token, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeReactionMenu, setActiveReactionMenu] = useState(null); // Tracks which message has the menu open
  
  const scrollRef = useRef();
  const typingTimeoutRef = useRef(null);

  // 1. Fetch Chat History and Block Status
  useEffect(() => {
    if (!partnerId || partnerId === "undefined") return;

    // Fetch history
    fetch(`http://localhost:5000/api/messages/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(err => console.error("History Error:", err));

    // Optional: Fetch if partner is blocked from backend
   // ✅ Fixed block status property path matching backend response keys
fetch(`http://localhost:5000/api/messages/block-status/${partnerId}`, {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((res) => res.json())
  .then((data) => setIsBlocked(data.blocked || false))
  .catch(() => {});

    // 2. Socket Listeners
    if (socket && currentUser?._id) {
      socket.emit("joinChat", { userId: currentUser._id, partnerId });
      
      // Real-time message receiver
      socket.on("receiveMessage", (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        socket.emit("messageSeen", { messageId: newMessage._id, senderId: partnerId });
      });

      // Real-time reactions receiver
      socket.on("messageReactionUpdate", ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );
      });

      // Real-time typing listeners
      socket.on("userTyping", ({ userId }) => {
        if (userId === partnerId) {
          setIsPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
        }
      });

      socket.on("userStoppedTyping", ({ userId }) => {
        if (userId === partnerId) setIsPartnerTyping(false);
      });

      return () => {
        socket.off("receiveMessage");
        socket.off("messageReactionUpdate");
        socket.off("userTyping");
        socket.off("userStoppedTyping");
      };
    }
  }, [partnerId, socket, currentUser?._id, token]);

  // Typing state emission
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket && partnerId) {
      socket.emit("typing", { receiverId: partnerId, userId: currentUser._id });
    }
  };

  // Scroll window to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  // Handle message submission
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !partnerId || isBlocked) return;

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
      
      // ✅ Handle blocking feedback errors gracefully
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || "Message delivery failed.");
        return;
      }

      const savedMsg = await res.json();
      if (socket) socket.emit("sendMessage", savedMsg);
      setMessages((prev) => [...prev, savedMsg]);
      setText("");
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  // Handle blocking / unblocking user
  // Handle blocking / unblocking user
  // Handle blocking / unblocking user
  const toggleBlockUser = async () => {
    try {
      // ✅ FIXED: Always hit the exact toggle route "/block/:userId" defined in your message.js backend file
      const res = await fetch(`http://localhost:5000/api/messages/block/${partnerId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      // ✅ Properly syncs local state based on the updated boolean flag sent back by your server
      setIsBlocked(data.blocked);
    } catch (err) {
      console.error("Failed to toggle block status", err);
    }
  };
  // Handle Reacting to a message
  const handleReact = async (messageId, emoji) => {
    setActiveReactionMenu(null); // Close layout menu
    
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      const updatedReactions = await res.json(); // Array of reactions from backend

      // Local state update
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: updatedReactions } : m))
      );

      // Tell the system over sockets
      if (socket) {
        socket.emit("sendReaction", { messageId, receiverId: partnerId, reactions: updatedReactions });
      }
    } catch (err) {
      console.error("Failed to save reaction", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 relative">
      
      {/* TOP HEADER CONTROLS (BLOCK ACTION) */}
      {/* TOP HEADER CONTROLS (BLOCK / UNBLOCK ACTION) */}
      <div className="px-6 py-2 bg-white border-b border-slate-100 flex justify-end items-center">
        <button 
          onClick={toggleBlockUser}
          className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all ${
            isBlocked 
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200" // Stands out clearer when they are blocked
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
        >
          <FaBan size={12} className={isBlocked ? "animate-pulse" : ""} />
          {/* ✅ FIXED: Changes button label text context dynamically based on live database state */}
          {isBlocked ? "Unblock User" : "Block User"}
        </button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => {
          const senderId = m.sender?._id || m.sender;
          const isMe = senderId === currentUser?._id;
          
          return (
            <div key={m._id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className="relative group flex items-center gap-2 max-w-[75%]">
                
                {/* Reaction Picker Button (triggers on hover for desktop or click on icon) */}
                {!isMe && (
                  <button 
                    onClick={() => setActiveReactionMenu(activeReactionMenu === m._id ? null : m._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white shadow-sm border rounded-full text-slate-400 hover:text-emerald-500 transition-opacity"
                  >
                    <FaRegSmile size={14} />
                  </button>
                )}

                <div className={`px-5 py-4 rounded-[1.8rem] text-[13px] font-bold shadow-sm relative ${
                    isMe ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none" 
                         : "bg-white text-slate-600 rounded-bl-none border border-slate-100/50"
                  }`}>
                  {m.text}
                  
                  {/* Embedded Custom Reactions Container inside the bubble */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div className="absolute -bottom-3 right-3 flex bg-white border border-slate-100 px-1.5 py-0.5 rounded-full shadow-sm text-xs gap-0.5">
                      {m.reactions.map((r, rIdx) => (
                        <span key={rIdx} title={r.username || ""}>{r.emoji}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                     <span className="text-[8px] font-black uppercase">
                       {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                     </span>
                     {isMe && <FaCheckDouble size={8} className={m.seen ? "text-blue-300" : "text-white/50"} />}
                  </div>
                </div>

                {/* Sender side Reaction Picker Button */}
                {isMe && (
                  <button 
                    onClick={() => setActiveReactionMenu(activeReactionMenu === m._id ? null : m._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white shadow-sm border rounded-full text-slate-400 hover:text-emerald-500 transition-opacity"
                  >
                    <FaRegSmile size={14} />
                  </button>
                )}

                {/* Floating Popup Selector Panel */}
                {activeReactionMenu === m._id && (
                  <div className={`absolute bottom-full z-10 flex gap-1 bg-white border border-slate-100 p-2 rounded-2xl shadow-xl mb-1 ${isMe ? 'right-0' : 'left-0'}`}>
                    {REACTION_OPTIONS.map((emoji) => (
                      <button 
                        key={emoji} 
                        onClick={() => handleReact(m._id, emoji)}
                        className="hover:scale-125 transition-transform text-base p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
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
        {isBlocked ? (
          <div className="text-center text-xs font-black text-rose-500 bg-rose-50/50 py-4 rounded-2xl uppercase tracking-wider border border-rose-100">
            You have blocked this conversation. Unblock to continue chatting.
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}