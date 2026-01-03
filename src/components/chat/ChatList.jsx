import React, { useEffect, useState } from "react";

import { useUser } from "../../context/UserContext";

const API = "http://localhost:5000";

export default function ChatList({ onSelect }) {
  const { token } = useUser();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setChats);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <h3 className="p-4 font-bold text-lg border-b">💬 Chats</h3>

      {chats.map(chat => (
        <div
          key={chat.roomId}
          onClick={() => onSelect(chat)}
          className="p-4 cursor-pointer hover:bg-gray-100 border-b"
        >
          <div className="font-semibold">{chat.user.fullName}</div>
          <div className="text-sm text-gray-500 truncate">
            {chat.lastMessage}
          </div>
        </div>
      ))}
    </div>
  );
}
