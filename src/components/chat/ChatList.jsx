// src/components/ChatList.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";

const API = "http://localhost:5000";

export default function ChatList({ onSelect }) {
  const { token } = useUser();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API}/api/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch conversations");

        const data = await res.json();

        // Ensure we have an array
        if (Array.isArray(data)) {
          setChats(data);
        } else {
          setChats([]);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [token]);

  if (loading) {
    return (
      <div className="h-full p-4 border-r">
        <p>Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 border-r text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="h-full p-4 border-r text-gray-500">
        <p>No conversations yet.</p>
        <p>Select a chat to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto border-r">
      <h3 className="p-4 font-bold text-lg border-b">💬 Chats</h3>
      {chats.map((chat) => (
        <div
          key={chat.roomId}
          onClick={() => onSelect(chat)}
          className="p-4 cursor-pointer hover:bg-gray-100 border-b flex items-center gap-3"
        >
          {/* User Avatar */}
          {chat.user.avatar ? (
            <img
              src={`${API}/uploads/${chat.user.avatar}`}
              alt={chat.user.fullName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
              {chat.user.fullName[0]}
            </div>
          )}

          {/* Name + Last Message */}
          <div className="flex-1">
            <div className="font-semibold">{chat.user.fullName}</div>
            <div className="text-sm text-gray-500 truncate">
              {chat.lastMessage || "No messages yet"}
            </div>
          </div>

          {/* Time of last message */}
          {chat.createdAt && (
            <div className="text-xs text-gray-400">
              {new Date(chat.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
