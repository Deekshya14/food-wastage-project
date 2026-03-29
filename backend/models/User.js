import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "donor", "receiver"],
      default: "receiver",
    },

    status: {
    type: String,
    enum: ["active", "banned"],
    default: "active"
  }, 
    organization: { type: String, default: "" },
    avatar: { type: String, default: "" },

    // 📩 NEW OTP & VERIFICATION FIELDS
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // 🔑 FORGOT PASSWORD FIELDS
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },

    // 🔴 NEW FIELD (IMPORTANT)
    isApproved: {
      type: Boolean,
      default: function () {
        // donors need admin approval
        return this.role !== "donor";
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
