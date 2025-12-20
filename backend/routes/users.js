import express from "express";
import multer from "multer";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  }
});
const upload = multer({ storage });

router.get("/me", authMiddleware, async (req,res) => {
  res.json(req.currentUser);
});

router.patch("/me", authMiddleware, upload.single("avatar"), async (req,res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: "User not found" });
    if (req.file) u.avatar = req.file.filename;
    Object.assign(u, req.body);
    await u.save();
    res.json(u);
  } catch(e){ res.status(500).json({ message: "Cannot update profile" }) }
});

export default router;
