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

app.get("/", (req, res) => res.send("MediConnect API Service Running"));
app.get("/ping", (req, res) => {
  res.status(200).json({ 
    status: "active", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

io.on("connection", (socket) => {
  socket.on("join-doctor-room", (docId) => {
    socket.join(`doctor_${docId}`);
  });
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