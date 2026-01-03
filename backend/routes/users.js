import express from "express";
import multer from "multer";
import User from "../models/User.js";
import {
  authMiddleware,
  adminMiddleware
} from "../middleware/authMiddleware.js";

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

router.patch(
  "/approve/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, {
      isApproved: true
    });

    res.json({ message: "Donor approved successfully" });
  }
);

export default router;
