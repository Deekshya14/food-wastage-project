import express from "express";
import Food from "../models/Food.js";
import { upload } from "../middleware/upload.js";
import { authMiddleware,adminMiddleware } from "../middleware/authMiddleware.js";
import Request from "../models/Request.js";
import Log from "../models/Log.js";

const router = express.Router();

// 1. CREATE FOOD

router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { lat, lng, pickupLocation } = req.body;

    const food = await Food.create({
      title: req.body.title,
      description: req.body.description,
      wasteCategory: req.body.wasteCategory,
      foodState: req.body.foodState,
      edibility: req.body.edibility,
      condition: req.body.condition,
      weight: Number(req.body.weight),
      availableDate: req.body.availableDate,
      priceType: req.body.priceType,
      price: req.body.priceType === "paid" ? Number(req.body.price) : 0,
      donorId: req.user.id,
      image: req.file?.filename,
      status: "available",
      

      
      // 📍 NEW STRUCTURE
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)], // Longitude first, then Latitude
        address: pickupLocation // This is the text description (e.g., "Near Kathmandu Mall")
      }
    });

    // 🔥 CREATE LOG
    await Log.create({
      action: "New Listing",
      details: `Donor ${req.user.fullName || 'User'} posted: ${req.body.title}`,
    });

    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. GET FOODS
// 2. GET FOODS (Enhanced with Location Search)
// 2. GET FOODS (Enhanced with Location Search)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let filter = {};
    
    if (req.user.role === "donor") filter.donorId = req.user.id;
    if (req.user.role === "receiver") filter.status = { $in: ["available", "reserved"] };

    const { lat, lng, dist } = req.query;

    // 🛡️ SECURITY FIX: Only use $near if lat/lng are valid numbers
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      filter["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(dist) || 50000 // default to 50km
        }
      };
    }

    // Use try/catch specifically for the find to see if index is missing
    let query = Food.find(filter).populate("donorId", "fullName email");

// 💡 If we ARE NOT searching by location, sort by newest first
if (!lat || !lng) {
  query = query.sort({ createdAt: -1 });
}

const foods = await query;
res.json(foods);
  } catch (err) {
    console.error("BACKEND ERROR:", err.message); // This will show in your terminal
    res.status(500).json({ message: err.message });
  }
});
// 3. UPDATE (PROTECTED)
// 3. UPDATE (PROTECTED)
router.patch("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });

    if (food.status === "reserved" || food.status === "completed") {
      return res.status(403).json({ message: "Approved listings cannot be edited." });
    }

    const { lat, lng, pickupLocation } = req.body;

    const update = {
      title: req.body.title,
      description: req.body.description,
      wasteCategory: req.body.wasteCategory,
      foodState: req.body.foodState,
      edibility: req.body.edibility,
      condition: req.body.condition,
      weight: Number(req.body.weight),
      availableDate: req.body.availableDate,
      priceType: req.body.priceType,
      price: req.body.priceType === "paid" ? Number(req.body.price) : 0,
      
      // 📍 UPDATE LOCATION OBJECT
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: pickupLocation
      }
    };

    if (req.file) update.image = req.file.filename;

    const updatedFood = await Food.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updatedFood);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. DELETE (PROTECTED)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });

    // Only owner can delete
    if (food.donorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 🛡️ SUPERVISOR FIX: Block delete if item is already approved
    if (food.status === "reserved" || food.status === "completed") {
      return res.status(403).json({ 
        message: "Action forbidden: This item is approved for a receiver and cannot be deleted." 
      });
    }

    await Request.deleteMany({ foodId: food._id });
    await Food.findByIdAndDelete(food._id);

    // 🔥 CREATE LOG
    await Log.create({
      action: "Listing Removed",
      details: `Admin deleted listing: ${food?.title || 'Unknown Item'}`,
    });

    res.json({ message: "Food and related requests deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});


/* ================= ADMIN: LISTING MANAGEMENT ================= */

// --- ADMIN: GET ALL LISTINGS ---
router.get("/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Populate donorId to show the donor's name in the admin table
    const allFood = await Food.find()
      .populate("donorId", "fullName email") 
      .sort({ createdAt: -1 });
    res.json(allFood);
  } catch (err) {
    res.status(500).json({ message: "Error fetching all listings" });
  }
});

// --- ADMIN: FORCE DELETE LISTING ---
router.delete("/admin-delete/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const foodId = req.params.id;
    
    // 1. Delete the food item
    await Food.findByIdAndDelete(foodId);
    
    // 2. Delete any requests associated with this food (Cleanup)
    await Request.deleteMany({ foodId: foodId });

    res.json({ message: "Listing and related requests removed by Admin" });
  } catch (err) {
    res.status(500).json({ message: "Admin delete failed" });
  }
});

// GET ALL LOGS (Admin Only)
router.get("/logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch logs" });
  }
});

// ⭐ ADD REVIEW ROUTE (Receiver submits review)
router.patch("/review/:id", authMiddleware, async (req, res) => {
  try {
    const { rating, ratingComment } = req.body;

    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    // Only allow review after completion
    if (food.status !== "completed") {
      return res.status(400).json({ message: "You can only review completed donations" });
    }

    // Save review
    food.rating = rating;
    food.ratingComment = ratingComment;

    await food.save();

    res.json({ message: "Review submitted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
export default router;
