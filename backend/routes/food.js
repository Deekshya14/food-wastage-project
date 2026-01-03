import express from "express";
import Food from "../models/Food.js";
import { upload } from "../middleware/upload.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE FOOD
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const food = await Food.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      meatType: req.body.meatType || "",
      spiceLevel: req.body.spiceLevel,
      quantity: Number(req.body.quantity), // 🔴 VERY IMPORTANT
      pickupLocation: req.body.pickupLocation,
      availableDate: req.body.availableDate,
      priceType: req.body.priceType,
      price: req.body.priceType === "paid" ? Number(req.body.price) : 0,
      donorId: req.user.id,
      image: req.file?.filename,
    });

    res.status(201).json(food);
  } catch (err) {
    console.error("CREATE FOOD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET donor foods
router.get("/", authMiddleware, async (req, res) => {
  try {
    let filter = {};

    // donor dashboard → only own foods
    if (req.user.role === "donor") {
      filter.donorId = req.user.id;
    }

    // receiver dashboard → available foods only
    if (req.user.role === "receiver") {
  filter.status = { $in: ["available", "reserved"] };
}


    const foods = await Food.find(filter).sort({ createdAt: -1 });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch foods" });
  }
});



// UPDATE
router.patch("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const update = {
      ...req.body,
      quantity: Number(req.body.quantity),
    };

    if (req.file) update.image = req.file.filename;

    await Food.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", authMiddleware, async (req, res) => {
  await Food.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
