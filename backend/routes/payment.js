import express from "express";
import Request from "../models/Request.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Route 1: Initiate Payment
router.post("/initiate", async (req, res) => {
  const { foodId, amount, foodTitle } = req.body;

  try {
    const response = await fetch("https://dev.khalti.com/api/v2/epayment/initiate/", {
      method: "POST",
      headers: {
        "Authorization": "Key 01dcdf9f569d416b9eb2811fda8889fc",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: "http://localhost:5000/api/payment/callback",
        website_url: "http://localhost:5173",
        amount: amount * 100,
        purchase_order_id: foodId,
        purchase_order_name: foodTitle,
      }),
    });

    const data = await response.json();
    console.log("Khalti Response:", data);
    res.json(data);

  } catch (err) {
    console.error("Khalti Error:", err);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

// Route 2: Khalti Callback (called by Khalti after payment)
router.get("/callback", async (req, res) => {
  const { pidx, status, purchase_order_id, amount } = req.query; // 👈 add amount

  if (status === "Completed") {
    try {
      const updatedRequest = await Request.findOneAndUpdate(
        { 
          foodId: purchase_order_id,
          status: "approved" // 👈 only update approved requests
        },
        { 
          isPaid: true, 
          paymentStatus: "paid", 
          pidx: pidx,
          paidAmount: parseInt(amount) / 100 // 👈 save actual amount in RS
        },
        { new: true }
      ).populate("foodId");

      // 🔔 Notify the donor in real-time
      const io = req.app.get("io");
      if (io && updatedRequest?.foodId?.donorId) {
        const donorId = updatedRequest.foodId.donorId.toString();
        const msg = `💰 Payment received for "${updatedRequest.foodId.title}"!`;

        // Save notification to DB
        await Notification.create({ userId: donorId, message: msg });

        // Send real-time to donor
        io.to(`donor_${donorId}`).emit("newNotification", {
          message: msg,
          type: "PAYMENT_RECEIVED"
        });
      }
    } catch (err) {
      console.error("Callback DB update failed:", err);
    }
  }

  res.redirect(`http://localhost:5173/payment/success?status=${status}&pidx=${pidx}&purchase_order_id=${purchase_order_id}`);
});

export default router;