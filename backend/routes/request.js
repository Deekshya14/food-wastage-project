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
  const donorId = food.donorId.toString();
  const donorRoom = `donor_${donorId}`;
  
  console.log("--- DEBUG SOCKET ---");
  console.log("Receiver Name:", req.user.fullName);
  console.log("Target Donor ID:", donorId);
  console.log("Emitting to Room:", donorRoom);
  
  io.to(donorRoom).emit("newNotification", {
    message: `New request from ${req.user.fullName} for "${food.title}"`,
    type: "NEW_REQUEST"
  });
  console.log("--- EMIT SUCCESSFUL ---");
} else {
  console.log("⚠️ ERROR: Socket.io (io) not found in app.get");
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

// 3. UPDATE status (Enhanced for real-time notifications)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.params.id).populate("foodId");

    if (!request) return res.status(404).json({ message: "Request not found" });
    
    if (request.foodId.donorId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    request.status = status;
    await request.save();

    // Handle Food Model updates
    if (status === "approved") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "reserved" });
      await Request.updateMany(
        { foodId: request.foodId._id, _id: { $ne: request._id } },
        { status: "rejected" }
      );
    }
    if (status === "completed") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "completed" });
    }

    // --- 🔔 NOTIFICATION LOGIC ---
    const io = req.app.get("io");
    const statusMsg = `Your request for "${request.foodId.title}" has been ${status}.`;

    // 1. Save to MongoDB
    await Notification.create({ 
      userId: request.receiverId, 
      message: statusMsg 
    });

    // 2. Send Real-time via Socket
    if (io) {
      // Send to the specific receiver's room
      io.to(request.receiverId.toString()).emit("newNotification", {
        message: statusMsg,
        time: new Date()
      });
      // Also tell their app to refresh the request list
      io.to(request.receiverId.toString()).emit("requestStatusUpdate");
    }

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