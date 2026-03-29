import express from "express";
// 1. Add 'verifyOTP' to your imports here
import { 
  signup, 
  login, 
  verifyOTP, 
  resendOTP, 
  forgotPassword, 
  resetPassword 
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// 2. Add this new line so the frontend can "talk" to the verification logic
router.post("/verify-otp", verifyOTP); 

router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
