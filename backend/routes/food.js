import express from "express";
import Food from "../models/Food.js";
import { upload } from "../middleware/upload.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Request from "../models/Request.js";

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
    const foods = await Food.find(filter).sort(lat && lng ? {} : { createdAt: -1 });
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

    res.json({ message: "Food and related requests deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
