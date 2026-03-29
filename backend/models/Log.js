import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., "Donor Approved"
  details: { type: String, required: true }, // e.g., "Admin approved Suman"
  adminName: { type: String }, // Optional: Name of the admin who did it
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Log", logSchema);