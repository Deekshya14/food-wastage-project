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

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    // Build conversation list
    const conversations = {};
    messages.forEach(msg => {
      const otherUser =
        msg.sender._id.toString() === userId
          ? msg.receiver
          : msg.sender;

      if (!conversations[otherUser._id]) {
        conversations[otherUser._id] = {
          roomId: otherUser._id,
          user: otherUser,
          lastMessage: msg.text,
          createdAt: msg.createdAt
        };
      }
    });

    res.json(Object.values(conversations));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

/* ================================
   ✅ 2. GET MESSAGES WITH USER
   ================================ */
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/* ================================
   ✅ 3. SEND MESSAGE (UNCHANGED)
   ================================ */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      text
    });

    const io = req.app.get("io");
    io.to(receiverId).emit("newMessage", message);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;
