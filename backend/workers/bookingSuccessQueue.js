import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const bookingSuccessQueue = new Queue("booking-success-queue", { connection });

bookingSuccessQueue.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Booking Success Queue Error:', err.message);
});

bookingSuccessQueue.client.then(client => client.on('error', (err) => {}));

export async function enqueueBookingSuccess(successData) {
  await bookingSuccessQueue.add(
    "process-booking-success",
    successData,
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}
