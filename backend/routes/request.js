import express from "express";
import Request from "../models/Request.js";
import Food from "../models/Food.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// 1. GET requests (Enhanced with Deep Population for Donor Info)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let requests;
    if (req.user.role === "receiver") {
      requests = await Request.find({ receiverId: req.user.id })
        .populate({
          path: "foodId",
          populate: {
            path: "donorId", // Deep populate donor info for the "My Reviews" section
            select: "fullName profileImage" 
          }
        })
        .populate("receiverId", "fullName");
    } else if (req.user.role === "donor") {
      // Find foods owned by this donor first
      const donorFoods = await Food.find({ donorId: req.user.id }).select("_id");
      const foodIds = donorFoods.map(f => f._id);

      requests = await Request.find({ foodId: { $in: foodIds } })
        .populate("foodId")
        .populate("receiverId", "fullName");
    }
    res.json(requests);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// 2. POST a new request (Socket.io ready)
router.post("/:foodId", authMiddleware, async (req, res) => {
  try {
    const { foodId } = req.params;
    const food = await Food.findById(foodId);

    if (!food || food.status !== "available") {
      return res.status(400).json({ message: "Food no longer available" });
    }

    const existing = await Request.findOne({ foodId, receiverId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: "You already requested this food" });
    }

    const request = await Request.create({
      foodId,
      receiverId: req.user.id,
      message: req.body.message || "",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`donor_${food.donorId.toString()}`).emit("newNotification", {
        message: `New request from ${req.user.fullName} for "${food.title}"`,
      });
    }

    await Notification.create({
      userId: food.donorId,
      message: `New request from ${req.user.fullName} for "${food.title}"`,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: "Cannot send request" });
  }
});

// 3. UPDATE status (Handle reserved/completed states)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.params.id).populate("foodId");

    if (!request) return res.status(404).json({ message: "Request not found" });
    
    // Safety check: only the donor can approve/reject/complete
    if (request.foodId.donorId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    request.status = status;
    await request.save();

    if (status === "approved") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "reserved" });
      // Reject others
      await Request.updateMany(
        { foodId: request.foodId._id, _id: { $ne: request._id } },
        { status: "rejected" }
      );
    }

    if (status === "completed") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "completed" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(request.receiverId.toString()).emit("requestStatusUpdate");
    }

    await Notification.create({ 
      userId: request.receiverId, 
      message: `Your request for "${request.foodId.title}" is now ${status}` 
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

// 4. RATE (Updated field name to ratingComment for frontend match)
router.post("/:id/rate", authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiverId.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    
    request.rating = rating;
    request.ratingComment = comment; 
    await request.save();

    res.json({ success: true, message: "Feedback saved!" });
  } catch (err) {
    res.status(500).json({ message: "Rating failed" });
  }
});

export default router;