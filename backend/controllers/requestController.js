import Request from "../models/Request.js";
import Food from "../models/Food.js";

export const createRequest = async (req, res) => {
  try {
    const { foodId, message } = req.body;
    const food = await Food.findById(foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });
    if (food.status !== "available") return res.status(400).json({ message: "Not available" });

    const donorId = food.donorId.toString();
    const receiverId = req.user.id;

    const existing = await Request.findOne({ foodId, receiverId });
    if (existing) return res.status(400).json({ message: "You already requested" });

    const reqDoc = await Request.create({ foodId, donorId, receiverId, message });
    res.status(201).json(reqDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot create request" });
  }
};

// donor gets requests for his foods
export const getRequestsForDonor = async (req, res) => {
  try {
    const donorId = req.user.id;
    const requests = await Request.find({ donorId }).populate("foodId").populate("receiverId", "fullName phone city");
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot fetch requests" });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    const food = await Food.findById(reqDoc.foodId);
    if (food.donorId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    const { status } = req.body; // 'approved' or 'rejected'
    reqDoc.status = status;
    await reqDoc.save();

    if (status === "approved") {
      food.status = "picked";
      await food.save();
    }

    res.json(reqDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot update request" });
  }
};
