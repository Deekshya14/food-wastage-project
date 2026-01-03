// src/components/chat/ChatLayout.jsx
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { io } from "socket.io-client";
import ChatWindow from "./ChatWindow";

const API = "http://localhost:5000";

export default function ChatLayout({ partnerId, onClose }) {
  const [socket, setSocket] = useState(null);
  const [chats, setChats] = useState([]); // list of all chat users/conversations
  const [selectedPartner, setSelectedPartner] = useState(partnerId || null);

  useEffect(() => {
    const s = io(API);
    setSocket(s);

    return () => s.disconnect();
  }, []);

  useEffect(() => {
    setSelectedPartner(partnerId); // open chat directly if partnerId is provided
  }, [partnerId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
      <div className="bg-white w-full md:w-96 h-full flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold text-lg">💬 Chats</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* CHAT LIST */}
          {!selectedPartner && (
            <div className="w-1/3 border-r overflow-y-auto">
              {chats.length === 0 ? (
                <p className="p-4 text-gray-500">No conversations yet</p>
              ) : (
                chats.map((c) => (
                  <div
                    key={c.userId}
                    className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                    onClick={() => setSelectedPartner(c.userId)}
                  >
                    <div className="bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
                      {c.initials}
                    </div>
                    <span>{c.name}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CHAT WINDOW */}
          <div className="flex-1">
            {selectedPartner ? (
              <ChatWindow
                socket={socket}
                partnerId={selectedPartner}
                onCloseChat={() => setSelectedPartner(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
