import Message from "../models/Message.js";

export const saveMessage = async ({ senderId, receiverId, text }) => {
  const roomId = [senderId, receiverId].sort().join("_"); // unique room for two users

  const message = await Message.create({ roomId, senderId, receiverId, text });
  return message.populate("senderId", "fullName avatar")
                .populate("receiverId", "fullName avatar");
};

export const getMessages = async (req, res) => {
  const { userId } = req.params;      // other user
  const roomId = [req.user.id, userId].sort().join("_");

  const messages = await Message.find({ roomId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar")
    .populate("receiverId", "fullName avatar");

  res.json(messages);
};
