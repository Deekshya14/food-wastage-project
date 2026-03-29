import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js"; 

// ======================= SIGNUP =======================
export const signup = async (req, res) => {
  try {
    const { fullName, email, phone, city, password, role, organization } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // 🆕 ADMIN BYPASS LOGIC
    const isAdmin = role === "admin";
    
    // Only generate OTP if NOT an admin
    const otp = isAdmin ? undefined : Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = isAdmin ? undefined : Date.now() + 10 * 60 * 1000;

    const user = await User.create({
      fullName,
      email,
      phone,
      city,
      password: hashed,
      role,
      organization,
      isApproved: role !== "donor", 
      otp,           
      otpExpires,    
      isVerified: isAdmin // 🆕 Admins are verified by default
    });

    // 🆕 ONLY SEND EMAIL IF NOT ADMIN
    if (!isAdmin) {
      try {
        await sendEmail({
          email: user.email,
          subject: "Verify your FoodWiseConnect Account",
          message: `Your verification code is: ${otp}. It expires in 10 minutes.`
        });
      } catch (emailErr) {
        console.error("Email failed to send:", emailErr);
      }
      
      return res.status(201).json({
        message: "Registration successful. Please check your email for the verification code.",
        email: user.email 
      });
    }

    // Response for Admin
    res.status(201).json({
      message: "Admin account created successfully. You can now login.",
      user: { id: user._id, role: user.role }
    });

  } catch (err) {
    console.error("Signup Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================= VERIFY OTP =======================
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ 
      email, 
      otp, 
      otpExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined; 
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully! You can now login." });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};


// ======================= RESEND OTP =======================
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "New Verification Code - FoodWiseConnect",
      message: `Your new verification code is: ${otp}`
    });

    res.json({ message: "New OTP sent to your email!" });
  } catch (err) {
    res.status(500).json({ message: "Error resending OTP" });
  }
};

// ======================= FORGOT PASSWORD =======================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "No account with that email." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "Password Reset Code",
      message: `Your password reset code is: ${otp}`
    });

    res.json({ message: "Reset code sent to email!" });
  } catch (err) {
    res.status(500).json({ message: "Error sending reset email" });
  }
};


// ======================= RESET PASSWORD =======================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({ message: "Password reset successful! You can now login." });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
};



// ======================= LOGIN =======================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // 🆕 UPDATED: ALLOW ADMINS TO BYPASS VERIFICATION
    // This also helps you access your old accounts if you change their role to admin
    if (!user.isVerified && user.role !== "admin") {
      return res.status(401).json({ message: "Please verify your email first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (user.role === "donor" && !user.isApproved) {
      return res.status(403).json({
        message: "Your donor account is pending admin approval"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};