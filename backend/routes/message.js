import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================================
   ✅ 1. GET CONVERSATIONS
   ================================ */
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Get all messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    const conversations = new Map();

    messages.forEach((msg) => {
      // Determine the other person in the chat
      const otherUser =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;

      if (!conversations.has(otherUser._id.toString())) {
        conversations.set(otherUser._id.toString(), {
          roomId: msg.roomId,
          otherUser: otherUser, // Changed key to 'otherUser' for frontend compatibility
          lastMessage: msg.text,
          createdAt: msg.createdAt,
        });
      }
    });

    res.json([...conversations.values()]);
  } catch (err) {
    console.error("Conversation Fetch Error:", err);
    res.status(500).json([]);
  }
});

/* ================================
   ✅ 2. GET MESSAGES WITH SPECIFIC USER
   ================================ */
/* ✅ GET MESSAGES WITH SPECIFIC USER (AND MARK AS SEEN) */
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const partnerId = req.params.userId;

    // 1️⃣ Mark all unread messages from the partner as seen
    await Message.updateMany(
      { sender: partnerId, receiver: currentUserId, seen: false },
      { $set: { seen: true } }
    );

    // 2️⃣ Fetch history
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: partnerId },
        { sender: partnerId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName avatar")
      .populate("receiver", "fullName avatar");

    res.json(messages);
  } catch (err) {
    console.error("Message Fetch Error:", err);
    res.status(500).json([]);
  }
});

/* ================================
   ✅ 3. SEND MESSAGE (UPDATED WITH NOTIFICATIONS)
   ================================ */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    // 1️⃣ Create unique roomId
    const roomId = [req.user.id, receiverId].sort().join("_");

    // 2️⃣ Save to Database
    const message = await Message.create({
      roomId,
      sender: req.user.id,
      receiver: receiverId,
      text,
    });

    const io = req.app.get("io");
    if (io) {
      // 3️⃣ Real-time update for the Chat Window (Room based)
      io.to(roomId).emit("newMessage", message);

      // 4️⃣ Real-time update for the Notification Bell (User based)
      // This sends a ping to the receiver's private room
      io.to(receiverId).emit("newNotification", {
        type: "MESSAGE",
        senderName: req.user.fullName,
        message: text,
        time: new Date()
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;