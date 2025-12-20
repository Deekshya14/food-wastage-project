import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).populate("senderId", "fullName avatar");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Cannot fetch messages" });
  }
};

export const saveMessage = async (payload) => {
  // called from socket when message arrives
  const { roomId, senderId, receiverId, text } = payload;
  const m = await Message.create({ roomId, senderId, receiverId, text });
  return m;
};
