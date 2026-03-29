import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    seen: { type: Boolean, default: false }, // Updated field name for clarity
  },
  { timestamps: true }
);
export default mongoose.model("Message", messageSchema);
