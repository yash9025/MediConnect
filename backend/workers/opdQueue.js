import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const opdQueue = new Queue("opd-sync-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

opdQueue.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") console.warn("BullMQ OPD Sync Queue Error:", err.message);
});

opdQueue.client.then((client) => client.on("error", (err) => {}));

export async function enqueueOpdSync(data) {
  const { docId, type } = data;
  const jobId = `${docId}_${type || 'sync'}_${Date.now()}`;

  await opdQueue.add("process-opd-sync", data, {
    jobId,
  });
}
