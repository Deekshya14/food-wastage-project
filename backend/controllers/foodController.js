import Food from "../models/Food.js";
import Request from "../models/Request.js";

// create with file upload (image filename in req.file.filename)
export const createFood = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { title, type, description, quantity, pickupLocation, availableDate } = req.body;
    const image = req.file ? req.file.filename : "";
    const food = await Food.create({ donorId, title, type, description, quantity, pickupLocation, availableDate, image });
    res.status(201).json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot create food" });
  }
};

// get foods — supports donorId query or status/available listing
export const getFoods = async (req, res) => {
  try {
    const { donorId, status, city } = req.query;
    const filter = {};
    if (donorId) filter.donorId = donorId;
    if (status) filter.status = status;
    if (city) filter.pickupLocation = city;
    const foods = await Food.find(filter).populate("donorId", "fullName email city avatar");
    res.json(foods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot fetch foods" });
  }
};

export const updateFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });
    if (food.donorId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    // handle new image if uploaded
    if (req.file) req.body.image = req.file.filename;

    Object.assign(food, req.body);
    await food.save();
    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot update food" });
  }
};

export const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });
    if (food.donorId.toString() !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });
    food.status = "removed";
    await food.save();
    res.json({ message: "Food removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot delete food" });
  }
};
