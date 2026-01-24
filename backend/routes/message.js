import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================================
   ✅ 1. GET CONVERSATIONS (NEW)
   ================================ */
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Get all messages where user is sender OR receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    // 2️⃣ Group messages by the OTHER user
    const conversations = new Map();

    messages.forEach((msg) => {
      const otherUser =
        msg.sender._id.toString() === userId
          ? msg.receiver
          : msg.sender;

      // 3️⃣ Only take the latest message per user
      if (!conversations.has(otherUser._id.toString())) {
        conversations.set(otherUser._id.toString(), {
          roomId: msg.roomId,
          user: otherUser,
          lastMessage: msg.text,
          createdAt: msg.createdAt,
        });
      }
    });

    // 4️⃣ IMPORTANT: return ARRAY (not object)
    res.json([...conversations.values()]);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});




/* ================================
   ✅ 2. GET MESSAGES WITH USER
   ================================ */
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});


/* ================================
   ✅ 3. SEND MESSAGE (UNCHANGED)
   ================================ */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    // 1️⃣ Create SAME roomId for both users
    const roomId = [req.user.id, receiverId].sort().join("_");

    // 2️⃣ Save message
    const message = await Message.create({
      roomId,
      sender: req.user.id,
      receiver: receiverId,
      text,
    });

    // 3️⃣ Emit real-time update
    const io = req.app.get("io");
    io.to(roomId).emit("newMessage", message);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
});


export default router;
