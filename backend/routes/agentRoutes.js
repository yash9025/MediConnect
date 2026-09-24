import express from "express";
import { streamAgentAnalysis } from "../controllers/agentController.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.js";

const agentRouter = express.Router();

// SSE streaming route for V2 multi-agent analysis
// Supports raw text payload OR direct PDF file upload
agentRouter.post(
  "/v2/stream",
  verifyToken,
  authorizeRoles("patient"),
  upload.single("pdf"),
  streamAgentAnalysis
);

export default agentRouter;

