import express from "express";

const router = express.Router();

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
        return_url: "http://localhost:5173/payment/success",
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

export default router;