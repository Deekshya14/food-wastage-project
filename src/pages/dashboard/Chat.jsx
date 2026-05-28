import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useUser } from "../../context/UserContext";
import { FaPaperPlane, FaImage, FaTrash, FaBan, FaSmile, FaTimes } from "react-icons/fa";

const API = "http://localhost:5000";
const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function Chat({ otherUserId }) {
  const { user, token } = useUser();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // messageId
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const socketRef = useRef();
  const bottomRef = useRef();
  const fileInputRef = useRef();

  const roomId = [user._id, otherUserId].sort().join("_");

  // ── FETCH MESSAGES + BLOCK STATUS ──
  useEffect(() => {
    if (!otherUserId) return;

    // Fetch messages
    fetch(`${API}/api/messages/${otherUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []));

    // Fetch block status
    // Fetch block status
fetch(`${API}/api/messages/block-status/${otherUserId}`, {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(res => res.json())
  .then(data => {
    setIsBlocked(data.blocked);
  });

// Fetch other user info
fetch(`${API}/api/users/${otherUserId}`, {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(res => res.json())
  .then(data => {
    setOtherUser(data);

    // Check if THEY blocked YOU
    const theyBlockedMe = data.blockedUsers?.includes(user._id);
    setBlockedByThem(!!theyBlockedMe);
  })
  .catch(() => {});
  }, [otherUserId]);

  // ── SOCKET ──
  useEffect(() => {
    if (!otherUserId) return;

    socketRef.current = io(API);
    socketRef.current.emit("joinRoom", roomId);

    socketRef.current.on("newMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on("messageDeleted", ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    socketRef.current.on("messageReaction", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    return () => socketRef.current.disconnect();
  }, [otherUserId]);

  // ── AUTO SCROLL ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── SEND MESSAGE ──
  const sendMessage = async () => {
    if (!text.trim() && !imageFile) return;
    if (isBlocked || blockedByThem) return;

    const formData = new FormData();
    formData.append("receiverId", otherUserId);
    formData.append("text", text);
    if (imageFile) formData.append("image", imageFile);

    try {
      await fetch(`${API}/api/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setText("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  // ── DELETE MESSAGE ──
  const deleteMessage = async (msgId) => {
    await fetch(`${API}/api/messages/${msgId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── REACT TO MESSAGE ──
  const reactToMessage = async (msgId, emoji) => {
    await fetch(`${API}/api/messages/${msgId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    setShowEmojiPicker(null);
  };

  // ── BLOCK / UNBLOCK ──
  const toggleBlock = async () => {
    const res = await fetch(`${API}/api/messages/block/${otherUserId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setIsBlocked(data.blocked);
  };

  // ── IMAGE PICK ──
  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const canChat = !isBlocked && !blockedByThem;

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-white font-black text-sm">
            {otherUser?.fullName?.[0] || "?"}
          </div>
          <div>
            <p className="font-black text-sm text-slate-800">{otherUser?.fullName || "Loading..."}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              {isBlocked ? "🚫 Blocked" : "Active"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleBlock}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
            isBlocked
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              : "bg-rose-50 text-rose-500 hover:bg-rose-100"
          }`}
        >
          <FaBan size={10} /> {isBlocked ? "Unblock" : "Block"}
        </button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50">
        {messages.map((m) => {
          const isMine = m.sender === user._id || m.sender?._id === user._id;
          const senderId = m.sender?._id || m.sender;

          return (
            <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
              <div className="relative max-w-[70%]">

                {/* MESSAGE BUBBLE */}
                <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                  isMine
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                }`}>
                  {/* Image */}
                  {m.image && (
                    <img
                      src={`${API}/uploads/${m.image}`}
                      className="rounded-xl mb-2 max-w-[220px] cursor-pointer"
                      onClick={() => window.open(`${API}/uploads/${m.image}`)}
                    />
                  )}
                  {/* Text */}
                  {m.text && <p>{m.text}</p>}

                  {/* Seen receipt */}
                  {isMine && (
                    <p className={`text-[9px] mt-1 text-right ${m.seen ? "text-blue-200" : "text-blue-300/60"}`}>
                      {m.seen ? "✓✓ Seen" : "✓ Sent"}
                    </p>
                  )}
                </div>

                {/* REACTIONS DISPLAY */}
                {m.reactions?.length > 0 && (
                  <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {m.reactions.map((r, i) => (
                      <span key={i} className="bg-white border border-slate-100 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* HOVER ACTIONS */}
                <div className={`absolute top-0 ${isMine ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} hidden group-hover:flex items-center gap-1`}>
                  {/* Emoji react button */}
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === m._id ? null : m._id)}
                    className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:bg-slate-50 text-slate-400"
                  >
                    <FaSmile size={11} />
                  </button>
                  {/* Delete button (own messages only) */}
                  {isMine && (
                    <button
                      onClick={() => deleteMessage(m._id)}
                      className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                    >
                      <FaTrash size={11} />
                    </button>
                  )}
                </div>

                {/* EMOJI PICKER POPOVER */}
                {showEmojiPicker === m._id && (
                  <div className={`absolute z-50 bottom-full mb-2 ${isMine ? "right-0" : "left-0"} bg-white border border-slate-100 rounded-2xl shadow-xl p-2 flex gap-1`}>
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => reactToMessage(m._id, emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button onClick={() => setShowEmojiPicker(null)} className="text-slate-300 hover:text-slate-500 p-1">
                      <FaTimes size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* BLOCKED BANNER */}
      {isBlocked && (
        <div className="px-5 py-3 bg-rose-50 border-t border-rose-100 text-center">
          <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest">
            You have blocked this user.{" "}
            <button onClick={toggleBlock} className="underline">Unblock</button>
          </p>
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div className="px-5 py-2 bg-white border-t border-slate-100 flex items-center gap-3">
          <img src={imagePreview} className="w-14 h-14 rounded-xl object-cover border border-slate-100" />
          <p className="text-[11px] font-bold text-slate-500 flex-1">Image ready to send</p>
          <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-rose-400 hover:text-rose-600">
            <FaTimes size={14} />
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="px-4 py-4 border-t border-slate-100 bg-white flex gap-2 items-center">
        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={!canChat}
          className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-40"
        >
          <FaImage size={16} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={!canChat}
          placeholder={isBlocked ? "You blocked this user" : "Type a message..."}
          className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none border border-transparent focus:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={sendMessage}
          disabled={!canChat || (!text.trim() && !imageFile)}
          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FaPaperPlane size={16} />
        </button>
      </div>
    </div>
  );
}