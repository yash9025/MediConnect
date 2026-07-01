import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const paymentQueue = new Queue("payment-queue", { connection });

paymentQueue.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Payment Queue Error:', err.message);
});

paymentQueue.client.then(client => client.on('error', (err) => {}));

export async function enqueuePaymentVerification(paymentData) {
  await paymentQueue.add(
    "process-payment",
    paymentData,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}
