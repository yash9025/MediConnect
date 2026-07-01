import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import labRoutes from "./routes/labRoutes.js";
import chatRouter from "./routes/chatRoute.js";
import agentRouter from "./routes/agentRoutes.js";
import doctorModel from "./models/doctorModel.js";
import queueChatModel from "./models/queueChatModel.js";

// Initialize Workers
import "./workers/bookingWorker.js";
import "./workers/paymentWorker.js";
import "./workers/emailWorker.js";
const PORT = process.env.PORT || 4000;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

app.use(express.json());
app.use(cors());

// Database Connections
(async () => {
  try {
    await connectDB();
    await connectCloudinary();
    console.log("Infrastructure Connected");
  } catch (err) {
    console.error("Infrastructure Connection Failed:", err);
    process.exit(1);
  }
})();

app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/lab", labRoutes);
app.use("/api/chat", chatRouter);
app.use("/api/agent", agentRouter);

app.get("/", (req, res) => res.send("MediConnect API Service Running"));

app.get("/ping", (req, res) => {
  res.status(200).json({ 
    status: "active", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

import { redisSubscriber } from "./config/pubsub.js";

io.on("connection", (socket) => {
  // A client joins a room specific to their job ID
  socket.on("join-job-room", (jobId) => {
    console.log(`Client joined job room: ${jobId}`);
    socket.join(`job_${jobId}`);
  });

  socket.on("join-doctor-room", (docId) => {
    socket.join(`doctor_${docId}`);
  });

  socket.on("join-admin-room", () => {
    socket.join("admin_global_queue_room");
  });

  socket.on("send-queue-message", async (data) => {
    try {
      const { docId, userId, appointmentId, sender, message, senderName, tokenNumber } = data;
      
      if (sender === "Patient") {
        // Anti-spam check
        const doctor = await doctorModel.findById(docId);
        if (doctor && doctor.blockedPatients && doctor.blockedPatients.includes(userId)) {
          // Send back an error just to the sender
          socket.emit("chat-error", { message: "You have been restricted from sending messages to this doctor." });
          return; // Early exit, DO NOT save to DB
        }
      }

      const newMsg = new queueChatModel({
        docId, userId, appointmentId, sender, message, senderName, tokenNumber
      });
      await newMsg.save();

      io.to(`doctor_${docId}`).emit("receive-queue-message", newMsg);
    } catch (error) {
      console.error("Socket send-queue-message error:", error);
    }
  });

  socket.on("report-spam", async (data) => {
    try {
      const { docId, userId } = data;
      await doctorModel.findByIdAndUpdate(docId, {
        $addToSet: { blockedPatients: userId } // $addToSet prevents duplicates
      });
      io.to(`doctor_${docId}`).emit("spam-reported", { userId });
    } catch (error) {
      console.error("Socket report-spam error:", error);
    }
  });
});

// Bridge Redis Pub/Sub events directly into Socket.io rooms
redisSubscriber.psubscribe("job_updates_*", (err, count) => {
  if (err) console.error("Failed to subscribe to Redis job channels:", err);
});

redisSubscriber.on("pmessage", (pattern, channel, message) => {
  // channel format: job_updates_{jobId}
  const jobId = channel.split("job_updates_")[1];
  
  // Forward the message to all clients in the Socket.io room `job_{jobId}`
  io.to(`job_${jobId}`).emit("ai-progress", JSON.parse(message));
});

app.use((err, req, res, next) => {
  console.error("Uncaught Error:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Internal Server Error", 
    error: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

const server = httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const gracefulShutdown = () => {
  console.log("Received shutdown signal. Closing HTTP server...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);