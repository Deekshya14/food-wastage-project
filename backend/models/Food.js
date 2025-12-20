import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    category: {
      type: String,
      enum: ["veg", "nonveg"],
      required: true,
    },

    meatType: {
      type: String,
      enum: ["chicken", "mutton", "pork", ""],
      default: "",
    },

    spiceLevel: {
      type: String,
      enum: ["mild", "medium", "spicy"],
      default: "medium",
    },

    quantity: {
      type: Number,
      required: true,
    },

    pickupLocation: {
      type: String,
      required: true,
    },

    availableDate: {
      type: Date,
      required: true,
    },

    priceType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },

    price: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
    },

    status: {
      type: String,
      enum: ["available", "requested", "completed"],
      default: "available",
    },

    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Food", foodSchema);
