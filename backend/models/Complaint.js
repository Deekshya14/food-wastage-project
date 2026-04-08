import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  },
  reportedUserId: {               // ADD THIS
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },

  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food",
    required: false 
  },
  reason: {
  type: String,
  required: true,
  enum: [
    "Food quality issue",
    "Donor did not show up", 
    "Wrong food description",
    "Inappropriate behavior",
    "Other"
  ]
},
  description: {
  type: String,
  required: false,
  default: ""
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