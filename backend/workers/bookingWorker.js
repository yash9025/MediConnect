import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

import mongoose from "mongoose";

// Worker for processing new bookings with per-doctor concurrency sharding & ACID Transactions
export const bookingWorker = new Worker(
  "booking-queue",
  async (job) => {
    const { appointmentData } = job.data;
    const { docId, slotDate, slotTime, _id } = appointmentData;
    
    // 1. Idempotency Check: Verify if this retry attempt already processed successfully
    const existingAppt = await appointmentModel.findById(_id);
    if (existingAppt && existingAppt.status === "confirmed") {
      console.log(`[Idempotency Guard] Job ${job.id} already processed. Skipping retry.`);
      return { success: true, message: "Already processed", appointmentId: _id };
    }

    // 2. ACID Transaction: Ensures all DB operations succeed or fail together automatically
    // If the server loses power or gets killed (SIGKILL), MongoDB automatically aborts uncommitted writes.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Atomic Conditional Match within Session
        const updatedDoctor = await doctorModel.findOneAndUpdate(
          {
            _id: docId,
            [`slots_booked.${slotDate}`]: { $ne: slotTime }
          },
          {
            $push: { [`slots_booked.${slotDate}`]: slotTime }
          },
          { new: true, session }
        );

        if (!updatedDoctor && !existingAppt) {
          throw new Error(`SLOT_ALREADY_TAKEN: Slot ${slotTime} on ${slotDate} for doctor ${docId} is already booked.`);
        }

        if (!existingAppt) {
          const newAppointment = new appointmentModel({
            ...appointmentData,
            payment: false,
            status: "pending"
          });
          await newAppointment.save({ session });
        }
      });
    } finally {
      await session.endSession();
    }

    return { success: true, appointmentId: _id, docId, slotDate, slotTime };
  },
  { 
    connection,
    concurrency: 10, // Allows up to 10 distinct doctor shards to process concurrently
    metrics: { maxDataPoints: 0 },
    skipStalledCheck: true,
    drainDelay: 300000 
  }
);

// Fail listener for final DLQ logging and Redis lock cleanup
bookingWorker.on("failed", async (job, err) => {
  if (job && job.attemptsMade >= job.opts.attempts) {
    console.error(`[DLQ] Booking job ${job.id} failed permanently after ${job.attemptsMade} exponential backoff retries:`, err.message);
    try {
      const { docId, slotDate, slotTime } = job.data.appointmentData;
      const lockKey = `lock:${docId}:${slotDate}:${slotTime}`;
      await connection.del(lockKey); // Release granular Redis lock on final failure
    } catch (cleanErr) {
      console.error("Failed to release Redis lock on permanent failure:", cleanErr);
    }
  }
});

// Worker for processing successful payments
export const bookingSuccessWorker = new Worker(
  "booking-success-queue",
  async (job) => {
    const { appointmentId } = job.data;
    
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    // Idempotency check
    if (appointment.payment === true) {
      console.log(`Appointment ${appointmentId} is already marked as paid. Ignoring duplicate event.`);
      return { success: true, message: "Already paid" };
    }

    // Update appointment
    appointment.payment = true;
    appointment.status = "confirmed";
    await appointment.save();

    console.log(`Appointment ${appointmentId} successfully marked as confirmed and paid.`);
    return { success: true };
  },
  { 
    connection,
    metrics: { maxDataPoints: 0 },
    skipStalledCheck: true,
    drainDelay: 300000 
  }
);
