import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },           // no longer required (image-only msgs)
    seen: { type: Boolean, default: false },
    image: { type: String, default: null },         // ← NEW: image/file path
    reactions: [                                    // ← NEW: emoji reactions
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      }
    ],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ← NEW: soft delete
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null }, // ← for future
  },
  { timestamps: true }
);
export default mongoose.model("Message", messageSchema);
