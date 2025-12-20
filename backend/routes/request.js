import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createRequest, getRequestsForDonor, updateRequestStatus } from "../controllers/requestController.js";

const router = express.Router();

router.post("/", authMiddleware, createRequest);
router.get("/", authMiddleware, getRequestsForDonor); // donor view
router.patch("/:id", authMiddleware, updateRequestStatus);

export default router;
