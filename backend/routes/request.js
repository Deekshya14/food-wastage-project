import express from "express";
import Request from "../models/Request.js";
import Food from "../models/Food.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// GET requests (receiver sees theirs, donor sees requests for their foods)
router.get("/", authMiddleware, async (req, res) => {
  let requests;

  if (req.user.role === "receiver") {
    requests = await Request.find({ receiverId: req.user.id })
      .populate("foodId", "title category pickupLocation donorId image")
      .populate("receiverId", "fullName");
  } 
  else if (req.user.role === "donor") {
    requests = await Request.find()
      .populate({
        path: "foodId",
        match: { donorId: req.user.id },
        select: "title category pickupLocation donorId image"
      })
      .populate("receiverId", "fullName");

    requests = requests.filter(r => r.foodId !== null);
  }

  res.json(requests);
});

// POST a new request
router.post("/:foodId", authMiddleware, async (req, res) => {
  try {
    const { foodId } = req.params;
    const food = await Food.findById(foodId);

    if (!food || food.status !== "available") {
      return res.status(400).json({ message: "Food not available" });
    }

    const existing = await Request.findOne({
      foodId,
      receiverId: req.user.id
    });

    if (existing) {
      return res.status(400).json({ message: "You already requested this food" });
    }

    const request = await Request.create({
      foodId,
      receiverId: req.user.id,
      message: req.body.message || "",
    });

    // 🔔 PROBLEM 6 FIX — Notify donor
    await Notification.create({
      userId: food.donorId,
      message: `New request received for "${food.title}"`,
      isRead: false,
    });

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot send request" });
  }
});

// UPDATE request status (Donor only)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.params.id).populate("foodId");

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.foodId.donorId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    request.status = status;
    await request.save();

    // ✅ When donor approves
    if (status === "approved") {
      await Food.findByIdAndUpdate(request.foodId._id, {
        status: "reserved"
      });

      await Request.updateMany(
        { foodId: request.foodId._id, _id: { $ne: request._id } },
        { status: "rejected" }
      );
    }

    // 🔔 Notify receiver (already correct)
    const io = req.app.get("io");
    io.to(request.receiverId.toString()).emit("newNotification", {
      message: `Your food request for "${request.foodId.title}" has been ${status}`,
      requestId: request._id,
      timestamp: new Date(),
    });

    await Notification.create({
      userId: request.receiverId,
      message: `Your food request for "${request.foodId.title}" has been ${status}`,
      isRead: false,
    });

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Status update failed" });
  }
});

export default router;
