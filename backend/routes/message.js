import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
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



// ── BLOCK / UNBLOCK USER ──
router.post("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const targetId = req.params.userId;
    const isBlocked = me.blockedUsers.includes(targetId);

    if (isBlocked) {
      me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== targetId);
    } else {
      me.blockedUsers.push(targetId);
    }

    await me.save();
    res.json({ blocked: !isBlocked });
  } catch (err) {
    res.status(500).json({ message: "Block action failed" });
  }
});


// ── CHECK IF USER IS BLOCKED ──
router.get("/block-status/:userId", authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const blocked = me.blockedUsers.includes(req.params.userId);
    res.json({ blocked });
  } catch (err) {
    res.status(500).json({ message: "Error" });
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
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    // Check if sender is blocked by receiver
   // ── MUTUAL BLOCK VALIDATION CHECK ──
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(req.user.id);

    // Condition 1: Has the receiver blocked the sender?
    if (receiver?.blockedUsers?.includes(req.user.id)) {
      return res.status(403).json({ message: "You are blocked by this user." });
    }

    // Condition 2: Has the sender blocked the receiver? (Prevents them from forcing messages through)
    if (sender?.blockedUsers?.includes(receiverId)) {
      return res.status(403).json({ message: "You have blocked this user. Unblock them to continue chatting." });
    }

    const roomId = [req.user.id, receiverId].sort().join("_");

    const message = await Message.create({
      roomId,
      sender: req.user.id,
      receiver: receiverId,
      text: text || "",
      image: req.file ? req.file.filename : null,
    });

    const io = req.app.get("io");
    if (io) {
      // Send the live chat message packet to the active room window
      io.to(roomId).emit("newMessage", message);
      io.to(receiverId).emit("receiveMessage", {
        type: "MESSAGE",
        senderName: req.currentUser?.fullName || "Someone", // 👈 Use req.currentUser here!
        message: text,
        time: new Date()
      });

      // 🔔 CREATE DATABASE NOTIFICATION WITH SENDER ID & REAL NAME
      // Get real sender name from current logged-in session profile
      const senderName = req.currentUser?.fullName || "Someone"; 

      const msgNotification = await Notification.create({
        userId: receiverId,
        senderId: req.user.id,                              // 👈 Saves senderId securely in MongoDB!
        type: "message",
        message: `💬 ${senderName} sent you a message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        relatedId: message._id 
      });

      // Emit notification back through standard live stream listener
      io.to(receiverId.toString()).emit("newNotification", msgNotification);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Failed to send message/notification:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// ── REACT TO MESSAGE ──
router.post("/:id/react", authMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Not found" });

    // Toggle: if same emoji from same user exists, remove it
    const existingIdx = message.reactions.findIndex(
      r => r.userId.toString() === req.user.id && r.emoji === emoji
    );

    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1); // remove
    } else {
      // Remove any previous reaction from this user first
      message.reactions = message.reactions.filter(
        r => r.userId.toString() !== req.user.id
      );
      message.reactions.push({ userId: req.user.id, emoji });
    }

    await message.save();

    // Broadcast updated reactions to room
    const io = req.app.get("io");
    if (io) io.to(message.roomId).emit("messageReaction", {
      messageId: message._id,
      reactions: message.reactions,
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: "Reaction failed" });
  }
});

// ── DELETE MESSAGE (soft delete) ──
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Not found" });
    if (message.sender.toString() !== req.user.id)
      return res.status(403).json({ message: "Can only delete your own messages" });

    message.deletedFor.push(req.user.id);
    await message.save();

    const io = req.app.get("io");
    if (io) io.to(message.roomId).emit("messageDeleted", { messageId: message._id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});


export default router;