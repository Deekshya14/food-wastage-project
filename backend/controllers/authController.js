import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ======================= SIGNUP =======================
export const signup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      city,
      password,
      role,
      organization
    } = req.body;

    // 1️⃣ Check if email exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    // 2️⃣ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3️⃣ Create user (IMPORTANT PART)
    const user = await User.create({
      fullName,
      email,
      phone,
      city,
      password: hashed,
      role,
      organization,

      // 🔴 KEY LOGIC
      isApproved: role !== "donor" // donors need admin approval
    });

    res.status(201).json({
      message:
        role === "donor"
          ? "Registration successful. Await admin approval."
          : "Registration successful",
      user
    });
  } catch (err) {
    console.error("Signup Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================= LOGIN =======================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    // 2️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // 3️⃣ BLOCK unapproved donors
    if (user.role === "donor" && !user.isApproved) {
      return res.status(403).json({
        message: "Your donor account is pending admin approval"
      });
    }

    // 4️⃣ Generate JWT
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
