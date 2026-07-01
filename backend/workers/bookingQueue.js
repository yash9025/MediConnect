import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const bookingQueue = new Queue("booking-queue", { connection });

bookingQueue.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Booking Queue Error:', err.message);
});

bookingQueue.client.then(client => client.on('error', (err) => {}));

export async function enqueueBooking(appointmentData) {
  await bookingQueue.add(
    "process-booking",
    appointmentData,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}
