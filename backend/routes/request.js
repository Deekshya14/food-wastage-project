import express from "express";
import Request from "../models/Request.js";
import Food from "../models/Food.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// 1. GET requests (Receiver sees theirs, Donor sees requests for their foods)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let requests;
    if (req.user.role === "receiver") {
      requests = await Request.find({ receiverId: req.user.id })
        .populate("foodId")
        .populate("receiverId", "fullName");
    } else if (req.user.role === "donor") {
      requests = await Request.find()
        .populate({
          path: "foodId",
          match: { donorId: req.user.id }
        })
        .populate("receiverId", "fullName");
      // Filter out requests that don't belong to this donor's food
      requests = requests.filter(r => r.foodId !== null);
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// 2. POST a new request
router.post("/:foodId", authMiddleware, async (req, res) => {
  try {
    const { foodId } = req.params;
    const food = await Food.findById(foodId);

    if (!food || food.status !== "available") {
      return res.status(400).json({ message: "Food not available" });
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

    await Notification.create({
      userId: food.donorId,
      message: `New request received for "${food.title}"`,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: "Cannot send request" });
  }
});

// 3. UPDATE request status (Donor handles: approved, rejected, completed)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.params.id).populate("foodId");

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.foodId.donorId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    request.status = status;
    await request.save();

    // Logic for specific status transitions
    if (status === "approved") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "reserved" });
      // Reject all other pending requests for the same food
      await Request.updateMany(
        { foodId: request.foodId._id, _id: { $ne: request._id } },
        { status: "rejected" }
      );
    }

    if (status === "completed") {
      await Food.findByIdAndUpdate(request.foodId._id, { status: "completed" });
    }

    // Notify receiver
    const io = req.app.get("io");
    const msg = `Your request for "${request.foodId.title}" is now ${status}`;
    
    if (io) {
      io.to(request.receiverId.toString()).emit("newNotification", { message: msg });
    }

    await Notification.create({ userId: request.receiverId, message: msg });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

// 4. RATE transaction (Receiver only, after completion)
router.post("/:id/rate", authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiverId.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    if (request.status !== "completed") return res.status(400).json({ message: "Complete the pickup before rating" });

    // Update the rating fields in the schema
    request.rating = rating;
    request.ratingComment = comment; // Using 'ratingComment' to match the frontend 'comment'
    await request.save();

    res.json({ success: true, message: "Feedback saved!" });
  } catch (err) {
    res.status(500).json({ message: "Rating failed" });
  }
});

export default router;