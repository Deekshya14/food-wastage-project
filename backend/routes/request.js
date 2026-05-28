import express from "express";
import Request from "../models/Request.js";
import Food from "../models/Food.js";

import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js";
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
  // If old request was rejected, delete it and allow re-request
  if (existing.status === 'rejected') {
    await Request.findByIdAndDelete(existing._id);
    // continue to create new request below
  } else {
    return res.status(400).json({ message: "You already requested this food" });
  }
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
    message: `New request from ${req.currentUser?.fullName || 'Someone'} for "${food.title}"`,
type: "NEW_REQUEST"
  });
  console.log("--- EMIT SUCCESSFUL ---");
} else {
  console.log("⚠️ ERROR: Socket.io (io) not found in app.get");
}

    await Notification.create({
  userId: food.donorId,
  type: "NEW_REQUEST",
  senderId: req.user.id,
message: `New request from ${req.user.fullName || 'Someone'} for "${food.title}"`,
relatedId: request._id,
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
    const request = await Request.findById(req.params.id).populate({
  path: "foodId",
  populate: { path: "donorId", select: "fullName" }
});

if (!request) return res.status(404).json({ message: "Request not found" });

// Extract donorId safely — handle both populated object and plain ID
const donorId = request.foodId?.donorId?._id 
  ? request.foodId.donorId._id.toString() 
  : request.foodId?.donorId?.toString();

if (donorId !== req.user.id)
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
if (status === "rejected") {
  // Check if there are any other approved requests for this food
  const otherApproved = await Request.findOne({
    foodId: request.foodId._id,
    status: "approved",
    _id: { $ne: request._id }
  });
  // If no other approved requests, make food available again
  if (!otherApproved) {
    await Food.findByIdAndUpdate(request.foodId._id, { status: "available" });
  }
}
if (status === "completed") {
  await Food.findByIdAndUpdate(request.foodId._id, { status: "completed" });
}

    // --- 🔔 NOTIFICATION LOGIC ---
    const io = req.app.get("io");
    const donorName = request.foodId?.donorId?.fullName || "The donor";
const statusMsg = status === "completed"
  ? `✅ ${donorName} confirmed your handover for "${request.foodId.title}"!`
  : status === "approved"
  ? `🎉 ${donorName} approved your request for "${request.foodId.title}"!`
  : `❌ ${donorName} rejected your request for "${request.foodId.title}".`;

    // 1. Save to MongoDB
    await Notification.create({ 
  userId: request.receiverId, 
  senderId: req.user.id,
  message: statusMsg,
  type: status === "completed" ? "request_completed" : status === "approved" ? "request_approved" : "request_rejected",  
  relatedId: request._id,  
});

    // 2. Send Real-time via Socket
    if (io) {
  io.to(request.receiverId.toString()).emit("newNotification", {
    message: statusMsg,
    type: status === "completed" ? "request_completed" : status === "approved" ? "request_approved" : "request_rejected",
    relatedId: request._id,
    time: new Date()
  });
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
    const request = await Request.findById(req.params.id).populate("foodId");

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiverId.toString() !== req.user.id) 
      return res.status(403).json({ message: "Unauthorized" });
    
    request.rating = rating;
    request.ratingComment = comment; 
    await request.save();

    // 🔔 Notify donor about the new review
    const io = req.app.get("io");
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    
    // 💡 FIX: Pull the fully loaded text string using req.currentUser instead of req.user
    const reviewerName = req.currentUser?.fullName || "A receiver";
    const msg = `⭐ ${reviewerName} rated "${request.foodId?.title || 'your food'}" ${stars} (${rating}/5)`;

    if (request.foodId?.donorId) {
      const donorId = request.foodId.donorId.toString();
      
      // 1. Write structured log to DB notification schema
      await Notification.create({ 
        userId: donorId, 
        message: msg,
        senderId: req.user.id, // 👈 Passing senderId tells the frontend who clicked!
        type: "NEW_REVIEW",
        relatedId: request._id,  
      });

      // 2. Transmit via active web socket stream array
      if (io) {
        io.to(`donor_${donorId}`).emit("newNotification", {
          senderId: req.user.id, // 👈 Added this so Donor layout receives it cleanly!
          message: msg,
          type: "NEW_REVIEW",
          relatedId: request._id
        });
      }
    }

    res.json({ success: true, message: "Feedback saved!" });
   
  } catch (err) {
    console.error("RATING ERROR:", err.message); 
    res.status(500).json({ message: err.message }); 
  }
});
// Admin: Get all paid transactions
router.get("/payments", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const paidRequests = await Request.find({ isPaid: true })
      .populate({
  path: "foodId",
  select: "title price image donorId",
  populate: { path: "donorId", select: "fullName email" }
})
      .populate("receiverId", "fullName email")
      .sort({ updatedAt: -1 });
    res.json(paidRequests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// Admin: Get all rated requests
router.get("/all-reviews", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rated = await Request.find({ rating: { $exists: true, $ne: null } })
      .populate({
        path: "foodId",
        select: "title image donorId",
        populate: { path: "donorId", select: "fullName email" }
      })
      .populate("receiverId", "fullName email")
      .sort({ updatedAt: -1 });

      // 👇 ADD THIS TEMPORARILY
    console.log("First review food:", JSON.stringify(rated[0]?.foodId, null, 2));
    
    res.json(rated);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

export default router;