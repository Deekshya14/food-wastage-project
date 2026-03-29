import mongoose from "mongoose";

// models/Notification.js
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who triggered it
  type: { 
    type: String, 
    enum: ["request_new", "request_approved", "request_rejected", "message"],
    required: true 
  },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of the Food or Request
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
