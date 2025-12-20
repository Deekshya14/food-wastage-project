import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import foodRoutes from "./routes/food.js";
import requestRoutes from "./routes/request.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/message.js";

import { saveMessage } from "./controllers/messageController.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err.message));

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => socket.join(roomId));

  socket.on("sendMessage", async (payload) => {
    const saved = await saveMessage(payload);
    io.to(payload.roomId).emit("newMessage", saved);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`)
);
