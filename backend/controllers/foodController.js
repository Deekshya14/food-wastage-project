import Food from "../models/Food.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// --- EXISTING CREATE FUNCTION ---
export const createFood = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { title, type, description, quantity, pickupLocation, availableDate } = req.body;
    const image = req.file ? req.file.filename : "";

    const food = await Food.create({
      donorId,
      title,
      type,
      description,
      quantity,
      pickupLocation,
      availableDate,
      image,
      status: "available"
    });

    const io = req.app.get("io");
    const receivers = await User.find({ role: "receiver" });

    for (const r of receivers) {
      const notif = await Notification.create({
        userId: r._id,
        message: `🍱 New food available: ${food.title}`
      });
      io.to(r._id.toString()).emit("newNotification", notif);
    }

    res.status(201).json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot create food" });
  }
};


export const deleteFood = async (req, res) => {
  try {
    const foodId = req.params.id;
    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    // 🛡️ CRITICAL CHECK: Prevent delete if approved/reserved
    if (food.status === "reserved" || food.status === "completed") {
      return res.status(403).json({ 
        message: "Action forbidden: This item is already approved for a receiver and cannot be deleted." 
      });
    }

    await Food.findByIdAndDelete(foodId);
    res.json({ message: "Food deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting food" });
  }
};

export const updateFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    // 🛡️ CRITICAL CHECK: Prevent editing if approved/reserved
    if (food.status === "reserved" || food.status === "completed") {
      return res.status(403).json({ 
        message: "Action forbidden: Approved listings cannot be edited." 
      });
    }

    const updatedFood = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedFood);
  } catch (err) {
    res.status(500).json({ message: "Error updating food" });
  }
};

