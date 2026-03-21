import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    title: { type: String,
    required: [true, "Title is required"],
    trim: true,
    minlength: [3, "Title must be at least 3 characters"],
    maxlength: [50, "Title cannot exceed 50 characters"] },
    description: String,
    wasteCategory: {
      type: String,
      enum: ["biodegradable", "non-biodegradable"],
      required: true,
    },
    foodState: {
      type: String,
      enum: ["cooked", "raw", "packaged", "expired"],
      required: true,
    },
    edibility: {
      type: String,
      enum: ["edible", "non-edible"],
      required: true,
    },
    condition: {
      type: String,
      enum: ["fresh", "near-expiry", "spoiled"],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: [0.1, "Weight must be at least 100 grams"]
    },

    // --- 📍 NEW LOCATION STRUCTURE ---
    location: {
      type: {
        type: String,
        enum: ["Point"], // Must be 'Point'
        default: "Point",
      },
      coordinates: {
        type: [Number], // [Longitude, Latitude]
        required: true,
      },
      address: {
        type: String, // The readable name (e.g., "Kathmandu, Nepal")
        required: true,
      },
    },
    // ---------------------------------

    availableDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v >= new Date().setHours(0,0,0,0);
      },
      message: "Available date cannot be in the past!"
    }
  },
    priceType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"]
    },
    image: String,
    status: {
      type: String,
      enum: ["available", "reserved", "completed"], // Note: changed requested to reserved to match your dashboard
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



foodSchema.index({ "location.coordinates": "2dsphere" });
export default mongoose.model("Food", foodSchema);