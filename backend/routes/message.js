import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMessages } from "../controllers/messageController.js";

const router = express.Router();
router.get("/:roomId", authMiddleware, getMessages);
export default router;
