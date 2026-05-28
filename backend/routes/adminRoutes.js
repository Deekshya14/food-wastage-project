import express from "express";
const router = express.Router();
import Complaint from "../models/Complaint.js";
import Food from "../models/Food.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

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
// ✅ NEW: Public Contact Form Route for website visitors
router.post("/public-contact", async (req, res) => {
  try {
    const { name, email, text } = req.body;

    // Validation validation check
    if (!name || !email || !text) {
      return res.status(400).json({ message: "Please provide name, email, and message body text." });
    }

    // 2. Generate a valid MongoDB ObjectId safely to satisfy the schema requirement
    const pseudoVisitorId = new mongoose.Types.ObjectId(); 

    // 3. Create the document matching the model constraints perfectly
    const complaint = await Complaint.create({
      userId: pseudoVisitorId, // Maps onto the strict required field
      reason: "Other",        // Must be one of the exact schema strings: "Food quality issue", "Donor did not show up", "Wrong food description", "Inappropriate behavior", "Other"
      description: `[WEBSITE CONTACT FORM]\nSender Name: ${name}\nSender Email: ${email}\n\nMessage:\n${text}`,
      status: "pending"        // Maps onto schema constraint
    });

    return res.status(201).json({ 
      message: "Message sent to admin successfully!", 
      complaint 
    });

  } catch (err) {
    // This will print the precise trace to your terminal if any other constraints fail
    console.error("CRITICAL PUBLIC CONTACT ROUTE EXCEPTION:", err); 
    return res.status(500).json({ 
      message: "Failed to process message due to an internal server validation error." 
    });
  }
});

// POST a new complaint (any logged-in receiver)
// ── FIXED COMPLAINTS ENDPOINT IN routes/adminRoutes.js ──

// ── routes/adminRoutes.js ──
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

    const complainantName = req.currentUser?.fullName || "A receiver";
    // 💡 Add a unique trigger tag [COMPLAINT] at the start of the message string
    const alertMessage = `[COMPLAINT] ⚠️ Issue reported by ${complainantName}: "${reason}". Details: ${description || 'No description provided'}`;

    if (reportedUserId) {
      const donorId = reportedUserId.toString();

      await Notification.create({
        userId: donorId,
        senderId: req.user.id,
        type: "NEW_REVIEW", // ✅ Validated enum type option that passes DB rules
        message: alertMessage,
        relatedId: complaint._id
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`donor_${donorId}`).emit("newNotification", {
          senderId: req.user.id,
          message: alertMessage,
          type: "COMPLAINT_REPORTED", // Live socket doesn't care about DB enums, keep it unique!
          relatedId: complaint._id
        });
      }
    }

    res.status(201).json(complaint);
  } catch (err) {
    console.error("COMPLAINT NOTIFICATION ERROR:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
});



// Dismiss a complaint
router.patch("/complaints/:id/dismiss", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Complaint.findByIdAndUpdate(req.params.id, { status: "dismissed" });
    res.json({ message: "Complaint dismissed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to dismiss complaint" });
  }
});

// Suspend the reported user from a complaint
router.patch("/complaints/:id/suspend-user", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    // Suspend the reported user
    await User.findByIdAndUpdate(complaint.reportedUserId, { status: "banned" });
    
    // Also mark complaint as resolved
    await Complaint.findByIdAndUpdate(req.params.id, { status: "resolved" });

    res.json({ message: "User suspended and complaint resolved" });
  } catch (err) {
    res.status(500).json({ message: "Failed to suspend user" });
  }
});

// @route   GET /api/reports/summary
router.get("/summary", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const weightStats = await Food.aggregate([
      { $group: { _id: null, totalWeight: { $sum: "$weight" } } }
    ]);

    //  Exclude admins from the user count metric box
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    
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