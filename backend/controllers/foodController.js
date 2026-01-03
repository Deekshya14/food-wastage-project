import Food from "../models/Food.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

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

    // 🔔 SOCKET + NOTIFICATION LOGIC
    const io = req.app.get("io");

    // find all receivers
    const receivers = await User.find({ role: "receiver" });

    for (const r of receivers) {
      const notif = await Notification.create({
        userId: r._id,
        message: `🍱 New food available: ${food.title}`
      });

      // emit to receiver room
      io.to(r._id.toString()).emit("newNotification", notif);
    }

    res.status(201).json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot create food" });
  }
};
