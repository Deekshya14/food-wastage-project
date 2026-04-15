import express from "express";
import multer from "multer";
import User from "../models/User.js";
import {
  authMiddleware,
  adminMiddleware
} from "../middleware/authMiddleware.js";
import Log from "../models/Log.js";

const router = express.Router();

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  }
});
const upload = multer({ storage });

/* ================= USER PROFILE ================= */

router.get("/me", authMiddleware, async (req, res) => {
  res.json(req.currentUser);
});

router.patch(
  "/me",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const u = await User.findById(req.user.id);
      if (!u) return res.status(404).json({ message: "User not found" });

      if (req.file) u.avatar = req.file.filename;
      Object.assign(u, req.body);

      await u.save();
      res.json(u);
    } catch (e) {
      res.status(500).json({ message: "Cannot update profile" });
    }
  }
);

router.delete("/me", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: "Cannot delete account" });
  }
});

/* ================= ADMIN: DONOR APPROVAL ================= */

// 🔥 THIS FIXES YOUR ERROR
router.get(
  "/pending-donors",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const donors = await User.find({
      role: "donor",
      isApproved: false
    }).select("-password");

    res.json(donors);
  }
);

router.patch("/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true });
    
    // 🔥 CREATE LOG
    await Log.create({
      action: "Donor Approved",
      details: `Admin approved donor account for: ${user.fullName}`,
    });

    res.json({ message: "Donor approved successfully" });
});

/* ================= ADMIN: USER MANAGEMENT ================= */

// --- ADMIN: TOGGLE USER STATUS (BAN/UNBAN) ---
router.patch("/status/:id", authMiddleware, adminMiddleware, async (req, res) => {
    const user = await User.findById(req.params.id);
    const newStatus = user.status === "banned" ? "active" : "banned";
    user.status = newStatus;
    await user.save();

    // 🔥 CREATE LOG
    await Log.create({
      action: newStatus === "banned" ? "User Suspended" : "User Restored",
      details: `Admin changed ${user.fullName}'s status to ${newStatus}`,
    });

    res.json({ message: `User is now ${newStatus}`, status: newStatus });
});

// --- ADMIN: GET ALL USERS ---
router.get("/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

export default router;