import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const emailQueue = new Queue("email-queue", { connection });

emailQueue.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Email Queue Error:', err.message);
});

emailQueue.client.then(client => client.on('error', (err) => {}));

export async function enqueueEmail(emailData) {
  await emailQueue.add(
    "send-email",
    emailData,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}
