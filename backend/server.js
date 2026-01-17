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

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "*";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.set("io", io);

// Middleware
app.use(express.json());
app.use(cors({ origin: CLIENT_URL }));

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

// Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/lab", labRoutes);
app.use("/api/chat", chatRouter);

// Health Check
app.get("/", (req, res) => res.send("MediConnect API Service Running"));
app.get("/ping", (req, res) => {
  res.status(200).json({ 
    status: "active", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Socket Events
io.on("connection", (socket) => {
  socket.on("join-doctor-room", (docId) => {
    socket.join(`doctor_${docId}`);
  });
});

// Global Error Handler
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

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log("Received shutdown signal. Closing HTTP server...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);