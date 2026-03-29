import Request from "../models/Request.js";
import Food from "../models/Food.js";
import Notification from "../models/Notification.js"; // Import your notification model

// HELPER FUNCTION to send notifications (saves space)
const sendNotification = async (io, userId, type, message, relatedId) => {
  try {
    const notif = await Notification.create({
      userId,
      type,
      message,
      relatedId,
    });
    // Emit to the specific user's room (matching your socket.emit("joinRoom", user._id))
    io.to(userId.toString()).emit("newNotification", notif);
  } catch (err) {
    console.error("Notification Error:", err);
  }
};

export const createRequest = async (req, res) => {
  try {
    const { foodId, message } = req.body;
    const food = await Food.findById(foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });
    if (food.status !== "available") return res.status(400).json({ message: "Not available" });

    const donorId = food.donorId.toString();
    const receiverId = req.user.id;

    const existing = await Request.findOne({ foodId, receiverId });
    if (existing) return res.status(400).json({ message: "You already requested" });

    const reqDoc = await Request.create({ foodId, donorId, receiverId, message });

    // --- NOTIFY DONOR ---
    const io = req.app.get("io");
    await sendNotification(
      io, 
      donorId, 
      "request_new", 
      `New request for your listing: "${food.title}"`, 
      reqDoc._id
    );

    res.status(201).json(reqDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot create request" });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    const food = await Food.findById(reqDoc.foodId);
    if (food.donorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    reqDoc.status = status;
    await reqDoc.save();

    const io = req.app.get("io");

    // --- LOGIC: WHEN APPROVED ---
    if (status === "approved") {
      food.status = "reserved"; 
      await food.save();

      // Notify the Approved Receiver
      await sendNotification(
        io, 
        reqDoc.receiverId, 
        "request_approved", 
        `Your request for "${food.title}" was approved! Check pickup details.`, 
        reqDoc._id
      );

      // Automation: Reject others and notify them
      const others = await Request.find({ 
        foodId: reqDoc.foodId, 
        _id: { $ne: reqDoc._id }, 
        status: "pending" 
      });

      for (let otherReq of others) {
        otherReq.status = "rejected";
        await otherReq.save();
        await sendNotification(
          io, 
          otherReq.receiverId, 
          "request_rejected", 
          `Sorry, the food "${food.title}" is no longer available.`, 
          otherReq._id
        );
      }
    }

    // --- LOGIC: WHEN COMPLETED ---
    if (status === "completed") {
      food.status = "completed";
      await food.save();
      
      await sendNotification(
        io, 
        reqDoc.receiverId, 
        "request_completed", 
        `Donation completed! Thank you for reducing food waste.`, 
        reqDoc._id
      );
    }

    // --- LOGIC: WHEN REJECTED ---
    if (status === "rejected") {
      const otherApproved = await Request.findOne({ foodId: food._id, status: "approved" });
      if (!otherApproved) {
        food.status = "available";
        await food.save();
      }

      await sendNotification(
        io, 
        reqDoc.receiverId, 
        "request_rejected", 
        `Your request for "${food.title}" was declined by the donor.`, 
        reqDoc._id
      );
    }

    res.json(reqDoc);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Cannot update request" });
  }
};