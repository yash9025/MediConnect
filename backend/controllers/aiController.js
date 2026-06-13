import { enqueueMedicalReport } from "../workers/aiQueue.js";
import { v4 as uuidv4 } from 'uuid';

export const analyzeBloodReport = async (req, res) => {
  try {
    const { rawPdfText } = req.body;

    if (!rawPdfText) {
      return res.status(400).json({ success: false, message: "No raw text provided for analysis." });
    }

    // Generate a unique ID for this analysis job
    const jobId = uuidv4();

    // Push the heavy lifting into BullMQ
    await enqueueMedicalReport(jobId, rawPdfText);

    // Return the jobId immediately so the frontend can subscribe to the WebSocket room
    res.status(202).json({
      success: true,
      message: "Analysis job queued successfully.",
      jobId: jobId
    });

  } catch (error) {
    console.error("Error queuing analysis job:", error);
    res.status(500).json({ success: false, message: "Failed to queue analysis." });
  }
};
