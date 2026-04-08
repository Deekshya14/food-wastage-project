import express from "express";
const router = express.Router();
import Complaint from "../models/Complaint.js";
import Food from "../models/Food.js";
import User from "../models/User.js";

// Change this to match the exported names in your middleware file
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js"; 

// @route   GET /api/reports/complaints
// You need BOTH: authMiddleware to get the user, adminMiddleware to check the role
router.get("/complaints", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId", "fullName email")
      .populate("foodId", "title image")
      .sort({ createdAt: -1 });
    
    res.status(200).json(complaints);
  } catch (err) {
    res.status(500).json({ message: "Error fetching complaints" });
  }
});


// POST a new complaint (any logged-in receiver)
router.post("/complaints", authMiddleware, async (req, res) => {
  try {
    const { reason, description, reportedUserId, foodId } = req.body;
    const complaint = await Complaint.create({
      userId: req.user.id,
      reason,
      description,
      reportedUserId,
      foodId,
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: "Failed to submit complaint" });
  }
});

// @route   GET /api/reports/summary
router.get("/summary", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const weightStats = await Food.aggregate([
      { $group: { _id: null, totalWeight: { $sum: "$weight" } } }
    ]);

    const totalUsers = await User.countDocuments();
    const activeComplaints = await Complaint.countDocuments({ status: "pending" });
    const completedRescues = await Food.countDocuments({ status: "completed" });

    res.status(200).json({
      totalWeight: weightStats[0]?.totalWeight || 0,
      totalUsers,
      activeComplaints,
      completedRescues
    });
  } catch (err) {
    res.status(500).json({ message: "Error generating report summary" });
  }
});

export default router;