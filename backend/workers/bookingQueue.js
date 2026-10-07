import { Queue } from "bullmq";
import { connection } from "../config/redis.js";

export const bookingQueue = new Queue("booking-queue", { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  }
});

bookingQueue.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('BullMQ Booking Queue Error:', err.message);
});

bookingQueue.client.then(client => client.on('error', (err) => {}));

export async function enqueueBooking(appointmentData) {
  const { docId, slotDate, slotTime, userId } = appointmentData;
  const groupId = `${docId}_${slotDate}`;
  const jobId = `${userId || 'anon'}_${docId}_${slotDate}_${slotTime}`.replace(/:/g, '-');

  await bookingQueue.add(
    "process-booking",
    { appointmentData },
    {
      groupId, // 🚀 Solution B: Per-Doctor Sharded Queue Isolation
      jobId,   // Slot reservation deduplication key
    }
  );
}

