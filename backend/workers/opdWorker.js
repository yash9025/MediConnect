import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

export const opdWorker = new Worker(
  "opd-sync-queue",
  async (job) => {
    const { type, docId, updateData, appointmentId, appointmentUpdate } = job.data;

    try {
      if (type === "UPDATE_DOCTOR_QUEUE" && docId && updateData) {
        await doctorModel.findByIdAndUpdate(docId, updateData);
      } else if (type === "MARK_ABSENT" && appointmentId && appointmentUpdate) {
        await appointmentModel.findByIdAndUpdate(appointmentId, appointmentUpdate);
        if (docId && updateData) {
          await doctorModel.findByIdAndUpdate(docId, updateData);
        }
      } else if (type === "RESET_QUEUE" && docId) {
        await doctorModel.findByIdAndUpdate(docId, { currentSlotTime: "" });
      } else if (type === "START_OPD" && docId && updateData) {
        await doctorModel.findByIdAndUpdate(docId, updateData);
      }

      return { success: true };
    } catch (error) {
      console.error(`Error processing OPD sync job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 50, // Drain up to 50 DB writes concurrently at a safe, controlled pace
    metrics: { maxDataPoints: 0 },
    skipStalledCheck: true,
    drainDelay: 300000,
  }
);

opdWorker.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") console.warn("OPD Worker Error:", err.message);
});
