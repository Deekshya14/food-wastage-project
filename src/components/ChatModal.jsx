import React, { useEffect, useState } from "react";

export default function ChatModal({ room, onClose, token, socket }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const API = "http://localhost:5000";

  useEffect(()=> {
    // join room
    socket.emit("joinRoom", room.roomId);

    // load past messages
    fetch(`${API}/api/messages/${room.roomId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).then(setMessages).catch(()=>{});

    socket.on("newMessage", (m) => {
      setMessages(prev=>[...prev, m]);
    });

    return ()=> {
      socket.off("newMessage");
    };
  // eslint-disable-next-line
  }, [room.roomId]);

  const send = () => {
    if (!text) return;
    const payload = { roomId: room.roomId, senderId: JSON.parse(localStorage.getItem("user"))._id, receiverId: room.receiverId || null, text };
    socket.emit("sendMessage", payload);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl bg-white rounded shadow p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Chat</h3>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="h-80 overflow-y-auto my-3 space-y-2">
          {messages.map(m => (
            <div key={m._id} className={`p-2 rounded ${m.senderId?._id === JSON.parse(localStorage.getItem("user"))._id ? "bg-green-50 self-end" : "bg-gray-100"}`}>
              <div className="text-sm">{m.text}</div>
              <div className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Message..." />
          <button onClick={send} className="bg-green-600 text-white px-4 py-2 rounded">Send</button>
        </div>
      </div>
    </div>
  );
}
