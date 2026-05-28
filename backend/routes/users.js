import express from "express";
import multer from "multer";
import User from "../models/User.js";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
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

router.patch("/me", authMiddleware, upload.single("avatar"), async (req, res) => {
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
});

/* ================= ADMIN: DONOR APPROVAL ================= */

router.get("/pending-donors", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const donors = await User.find({ role: "donor", isApproved: false }).select("-password");
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending donors" });
  }
});

router.patch("/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Donor approved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Approval workflow failed" });
  }
});

/* ================= ADMIN: USER MANAGEMENT ================= */

// Toggle user account status (Ban/Unban)
router.patch("/status/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newStatus = user.status === "banned" ? "active" : "banned";
    user.status = newStatus;
    await user.save();

    res.json({ message: `User is now ${newStatus}`, status: newStatus });
  } catch (err) {
    res.status(500).json({ message: "Status toggle processing error" });
  }
});

// --- ADMIN: GET ALL USERS ---
// Place this BEFORE the general /:id route so Express doesn't match the word "all" to an ID!
router.get("/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rawUsers = await User.find({}).lean();
    
    if (!rawUsers || rawUsers.length === 0) {
      return res.status(200).json([]);
    }

    const processedUsers = rawUsers.map(u => ({
      _id: u._id ? u._id.toString() : Math.random().toString(),
      fullName: String(u.fullName || u.name || u.email?.split('@')[0] || "Unknown Member"),
      email: String(u.email || "No Email"),
      role: String(u.role || "donor"),
      status: String(u.status || "active"),
      isApproved: u.isApproved ?? true,
      isVerified: u.isVerified ?? true,
      createdAt: u.createdAt || new Date()
    }));

    processedUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(processedUsers);
  } catch (error) {
    console.error("Database user query failure:", error.message);
    return res.status(200).json([]);
  }
});


/* =========================================
   ✅ PERMANENT ACCOUNT DELETION ENDPOINT
   ========================================= */
router.delete("/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Double check the account exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Account context not found." });
    }

    // 2. Erase the account row entirely out of MongoDB
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "Account has been wiped cleanly from the database." });
  } catch (err) {
    console.error("Account self-destruction sequence failed:", err);
    return res.status(500).json({ message: "Internal server crash while executing profile deletion." });
  }
});



// Individual specific user profile lookup (Keep at the absolute bottom)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("fullName avatar blockedUsers");
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error looking up user" });
  }
});

export default router;