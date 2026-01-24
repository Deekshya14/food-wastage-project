import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: "" },
  status: { 
    type: String, 
    // ADDED 'completed' HERE
    enum: ["pending", "approved", "rejected", "completed"], 
    default: "pending" 
  },
  // ADD THESE TWO FIELDS
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: { type: String }
}, { timestamps: true });

export default mongoose.model("Request", requestSchema);
