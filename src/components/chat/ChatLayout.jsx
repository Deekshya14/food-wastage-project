// src/components/chat/ChatLayout.jsx
import React, { useEffect, useState } from "react";
import { FaTimes, FaChevronLeft } from "react-icons/fa";
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
      
      // SAFEGUARD: Filter out any conversations where otherUser is missing
      const validConversations = Array.isArray(data) 
        ? data.filter(c => c && c.otherUser) 
        : [];
        
      setConversations(validConversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-[100]">
      <div className="bg-white w-full md:w-[450px] h-screen flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            {selectedPartner && (
              <button onClick={() => setSelectedPartner(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FaChevronLeft className="text-gray-400" size={14} />
              </button>
            )}
            <h2 className="font-black text-xl text-slate-800 tracking-tight">Messages</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedPartner ? (
            /* CONVERSATION LIST */
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-4 text-2xl">💬</div>
                  <p className="text-gray-400 font-bold text-sm">No conversations yet.<br/>Request food to start chatting!</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedPartner(conv.otherUser?._id)}
                    className="w-full p-4 hover:bg-blue-50/50 rounded-[1.5rem] flex items-center gap-4 transition-all border border-transparent hover:border-blue-100 group"
                  >
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      {/* Optional chaining to prevent crash if fullName is missing */}
                      {conv.otherUser?.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-black text-slate-800 text-sm">
                        {conv.otherUser?.fullName || "Unknown User"}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <div className="text-[10px] font-bold text-gray-300">
                      {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* ACTIVE CHAT WINDOW */
            <ChatWindow
              socket={socket}
              partnerId={selectedPartner}
              token={token}
              currentUser={user}
            />
          )}
        </div>
      </div>
    </div>
  );
}