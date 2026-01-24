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
import notificationRoutes from "./routes/notification.js";


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
app.set("io", io); // Make io accessible inside routes
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err.message));

// --- ONLINE USERS TRACKING ---
const onlineUsers = {}; // { userId: socketId }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- REGISTER ONLINE USER ---
  socket.on("userOnline", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("Online users:", onlineUsers);
  });

  // --- JOIN PRIVATE ROOM ---
  socket.on("joinRoom", ({ senderId, receiverId }) => {
    const roomId = [senderId, receiverId].sort().join("_");
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // --- SEND MESSAGE ---
  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    try {
      const message = await saveMessage({ senderId, receiverId, text });
      const roomId = [senderId, receiverId].sort().join("_");

      // Send message to both users in the room
      io.to(roomId).emit("newMessage", message);

      // Send notification to receiver if online
      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId && receiverSocketId !== socket.id) {
        io.to(receiverSocketId).emit("newNotification", {
          senderId,
          text,
          messageId: message._id,
          createdAt: message.createdAt,
        });
      }
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // --- HANDLE DISCONNECT ---
  socket.on("disconnect", () => {
    // Remove user from online list
    for (const [userId, sockId] of Object.entries(onlineUsers)) {
      if (sockId === socket.id) delete onlineUsers[userId];
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`)
);
