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
import paymentRoutes from "./routes/payment.js"; 
// Note: In ES modules, you MUST include the ".js" extension in the path.
import adminReportRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
 
app.use("/api/reports", adminReportRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.set("io", io); // Make io accessible inside routes
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

//app.use("/api/users", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payment", paymentRoutes);

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
  
socket.on("joinRoom", (roomName) => {
  socket.join(roomName);
  console.log(`Socket ${socket.id} joined room: ${roomName}`);
});

  // --- JOIN PRIVATE ROOM ---
  socket.on("joinChat", ({ userId, partnerId }) => {
  const roomId = [userId, partnerId].sort().join("_");
  socket.join(roomId);
  console.log(`User ${userId} joined room: ${roomId}`);
});

  // --- SEND MESSAGE ---
  
// --- SEND MESSAGE (UPDATED WITH SENDER NAME & SENDER ID) ---
// --- SEND MESSAGE (UPDATED WITH BLOCK CHECKS) ---
  socket.on("sendMessage", async (savedMsg) => {
    try {
      const senderId = savedMsg.sender;
      const receiverId = savedMsg.receiver;

      // 1. Fetch block details for both accounts dynamically from the database
      const senderUser = await mongoose.model("User").findById(senderId).select("blockedUsers");
      const receiverUser = await mongoose.model("User").findById(receiverId).select("blockedUsers");

      // 2. If a block state exists in either direction, cancel the live network stream immediately
      if (
        senderUser?.blockedUsers?.includes(receiverId) || 
        receiverUser?.blockedUsers?.includes(senderId)
      ) {
        console.log(`⚠️ WebSocket message suppressed: Block arrangement active between ${senderId} and ${receiverId}`);
        return; // Stops execution dead so nobody gets the message on their screen
      }

      // 3. If clear, proceed with normal channel room broadcasting
      const roomId = savedMsg.roomId;
      socket.to(roomId).emit("receiveMessage", savedMsg);

      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        // Fetch the sender details dynamically from your User Model
        const sender = await mongoose.model("User").findById(senderId).select("fullName");
        const senderName = sender?.fullName || "Someone";
        
        // Emit notification with both the name AND senderId
        io.to(receiverSocketId).emit("newNotification", {
          senderId: senderId,
          message: `💬 ${senderName} sent you a message: "${savedMsg.text}"`,
          type: "message",
          messageId: savedMsg._id,
        });
      }
    } catch (err) {
      console.error("Socket block check operation failed:", err);
    }
  });

socket.on("typing", ({ receiverId, userId }) => {
  const receiverSocketId = onlineUsers[receiverId];
  if (receiverSocketId) {
    socket.to(receiverSocketId).emit("userTyping", { userId });
  }
});

socket.on("stopTyping", ({ receiverId, userId }) => {
  const receiverSocketId = onlineUsers[receiverId];
  if (receiverSocketId) {
    socket.to(receiverSocketId).emit("userStoppedTyping", { userId });
  }
});



socket.on("messageSeen", async ({ messageId, senderId }) => {
  try {
    // Update DB
    await mongoose.model("Message").findByIdAndUpdate(messageId, { seen: true });
    
    // Notify the sender that their message was seen
    const senderSocketId = onlineUsers[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReadUpdate", { messageId });
    }
  } catch (err) {
    console.error("Error updating seen status:", err);
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