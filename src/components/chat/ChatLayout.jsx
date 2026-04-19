// src/components/chat/ChatLayout.jsx
import React, { useEffect, useState } from "react";
import { FaTimes, FaChevronLeft, FaCommentDots } from "react-icons/fa";
import { io } from "socket.io-client";
import ChatWindow from "./ChatWindow";
import { useUser } from "../../context/UserContext";

const API = "http://localhost:5000";

export default function ChatLayout({ partnerId, onClose }) {
  const { token, user } = useUser();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]); 
  const [selectedPartner, setSelectedPartner] = useState(partnerId || null);

  useEffect(() => {
    const s = io(API);
    setSocket(s);
    fetchConversations();
    return () => s.disconnect();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      const validConversations = Array.isArray(data) 
        ? data.filter(c => c && c.otherUser) 
        : [];
        
      setConversations(validConversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  // Helper for Initials (Consistent with ProfileCard)
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex justify-end z-[100]">
      <div className="bg-white w-full md:w-[450px] h-screen flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300">
        
        {/* --- MODERN HEADER --- */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            {selectedPartner && (
              <button 
                onClick={() => setSelectedPartner(null)} 
                className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all"
              >
                <FaChevronLeft size={14} />
              </button>
            )}
            <div>
              <h2 className="font-black text-2xl text-slate-800 tracking-tight">Messages</h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                {selectedPartner ? "Active Chat" : `${conversations.length} Conversations`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
          {!selectedPartner ? (
            /* CONVERSATION LIST */
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-400 rounded-[2rem] flex items-center justify-center mb-6 text-3xl shadow-inner">
                    <FaCommentDots />
                  </div>
                  <h3 className="text-slate-800 font-black text-sm uppercase tracking-tight">No chats yet</h3>
                  <p className="text-slate-400 font-bold text-[11px] mt-2 leading-relaxed">
                    Start a conversation by requesting <br/> food from the dashboard!
                  </p>
                </div>
              ) : (
                conversations.map((conv, index) => (
  <button
    key={conv._id || conv.otherUser?._id || index} // ✅ Falls back to user ID or array index
    onClick={() => setSelectedPartner(conv.otherUser?._id)}
                    className="w-full p-4 bg-white hover:bg-emerald-50/50 rounded-[2rem] flex items-center gap-4 transition-all border border-transparent hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5 group"
                  >
                    {/* Avatar with Initials logic */}
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[1.4rem] flex-shrink-0 flex items-center justify-center font-black text-sm shadow-lg shadow-emerald-100 group-hover:scale-105 transition-transform">
                      {getInitials(conv.otherUser?.fullName)}
                    </div>

                    <div className="text-left flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="font-black text-slate-800 text-sm truncate pr-2">
                          {conv.otherUser?.fullName || "Unknown User"}
                        </p>
                        <span className="text-[9px] font-black text-slate-300 uppercase shrink-0">
                          {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 truncate leading-snug">
                        {conv.lastMessage || "Click to start chatting..."}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* ACTIVE CHAT WINDOW */
            <div className="flex-1 bg-white animate-in fade-in duration-300">
              <ChatWindow
                socket={socket}
                partnerId={selectedPartner}
                token={token}
                currentUser={user}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}