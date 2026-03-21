import express from "express";
import axios from "axios";
import Request from "../models/Request.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/verify-khalti", authMiddleware, async (req, res) => {
  const { token, amount, requestId } = req.body;

  try {
    const response = await axios.post(
      "https://khalti.com/api/v2/payment/verify/",
      { token, amount },
      {
        headers: { 
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` 
        },
      }
    );

    if (response.data) {
      // Payment Successful! Update the request status
      await Request.findByIdAndUpdate(requestId, { 
        paymentStatus: "paid",
        transactionId: response.data.idx 
      });
      res.json({ success: true, message: "Payment Verified" });
    }
  } catch (err) {
    res.status(500).json({ message: "Payment Verification Failed" });
  }
});

export default router;