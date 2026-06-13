import express from "express";
import { streamAgentAnalysis } from "../controllers/agentController.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const agentRouter = express.Router();

// SSE streaming route for V2 multi-agent analysis
// No file upload needed here — client sends raw text
agentRouter.post(
  "/v2/stream",
  verifyToken,
  authorizeRoles("patient"),
  streamAgentAnalysis
);

export default agentRouter;
