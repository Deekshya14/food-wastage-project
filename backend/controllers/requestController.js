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
    const { status } = req.body; // 'approved', 'rejected', or 'completed'
    const reqDoc = await Request.findById(req.params.id);
    
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    const food = await Food.findById(reqDoc.foodId);
    
    // Security check: Only the donor who owns the food can update the request
    if (food.donorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update the specific request status
    reqDoc.status = status;
    await reqDoc.save();

    // --- LOGIC: WHEN APPROVED ---
    if (status === "approved") {
      // 1. Mark food as 'reserved' or 'picked' so it's hidden from search
      food.status = "reserved"; 
      await food.save();

      // 2. AUTOMATION: Reject all other pending requests for this specific food
      // This keeps your dashboard clean and notifies other users immediately
      await Request.updateMany(
        { 
          foodId: reqDoc.foodId, 
          _id: { $ne: reqDoc._id }, // Don't reject the one we just approved
          status: "pending" 
        },
        { status: "rejected" }
      );
    }

    // --- LOGIC: WHEN COMPLETED (Handover Done) ---
    if (status === "completed") {
      food.status = "completed"; // Officially close the listing
      await food.save();
    }

    // --- LOGIC: WHEN REJECTED ---
    if (status === "rejected") {
      // If the food was 'reserved' but the donor rejected it later, 
      // we might want to make it 'available' again.
      const otherApproved = await Request.findOne({ foodId: food._id, status: "approved" });
      if (!otherApproved) {
        food.status = "available";
        await food.save();
      }
    }

    res.json(reqDoc);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Cannot update request" });
  }
};