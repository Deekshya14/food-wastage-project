import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Get all notifications
router.get("/", authMiddleware, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
});

// 2. Mark ALL as read (Static route goes first!)
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error updating notifications" });
  }
});

// 3. Mark individual as read (Dynamic parameter route goes last)
router.put("/:id/read", authMiddleware, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: "Marked as read" });
});

export default router;
