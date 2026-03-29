import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food",
    required: false 
  },
  reason: {
    type: String,
    required: true,
    enum: ["Expired Food", "Incorrect Weight", "Safety Concern", "Poor Communication", "Other"]
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "resolved", "dismissed"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint; // Correct ES Module export