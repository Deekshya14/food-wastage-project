import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useUser } from "../../context/UserContext";
import { useParams } from "react-router-dom";
const API = "http://localhost:5000";

export default function Chat({ otherUserId }) {
  const { user, token } = useUser();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef();
  const { userId } = useParams();

 
const roomId = [user._id, userId].sort().join("_");

  useEffect(() => {
    socketRef.current = io(API);

    // Join the chat room
    socketRef.current.emit("joinRoom", roomId);

    // Listen for new messages
    socketRef.current.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Fetch chat history
    fetch(`${API}/api/messages/${otherUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data));

    return () => socketRef.current.disconnect();
  }, [otherUserId, user._id]);

  const sendMessage = () => {
    if (!text.trim()) return;

    const payload = {
      senderId: user._id,
      receiverId: otherUserId,
      text,
    };

    socketRef.current.emit("sendMessage", payload);
    setText("");
  };

  return (
    <div className="flex flex-col h-full p-4 border rounded">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((m) => (
          <div
            key={m._id}
            className={`p-2 mb-1 rounded ${
              m.senderId._id === user._id ? "bg-green-200 self-end" : "bg-gray-200 self-start"
            }`}
          >
            <strong>{m.senderId.fullName}: </strong>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
