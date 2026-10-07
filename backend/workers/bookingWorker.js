import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

import mongoose from "mongoose";

import userModel from "../models/userModel.js";

// Worker for processing new bookings with per-doctor concurrency sharding & ACID Transactions
export const bookingWorker = new Worker(
  "booking-queue",
  async (job) => {
    // Phase 4: Asynchronous Persistence (The "Slow Path")
    const appointmentData = job.data.appointmentData;
    const { docId, slotDate, slotTime, userId, _id } = appointmentData;
    const lockKey = `lock:${docId}:${slotDate}:${slotTime}`;
    
    // 1. Idempotency Check: Verify if this retry attempt already processed successfully
    const existingAppt = await appointmentModel.findById(_id);
    if (existingAppt) {
      console.log(`[Idempotency Guard] Job ${job.id} already processed. Skipping retry.`);
      return { success: true, message: "Already processed", appointmentId: _id };
    }

    // 2. MongoDB ACID Transaction: Ensures all DB operations succeed or fail together automatically
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // A. Atomic Conditional Match within Session
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

        if (!updatedDoctor) {
          throw new Error(`SLOT_ALREADY_TAKEN: Slot ${slotTime} on ${slotDate} for doctor ${docId} is already booked.`);
        }

        // B. Fetch Relational Data securely within the transaction
        const docData = await doctorModel.findById(docId).select("-password").session(session);
        const userData = await userModel.findById(userId).select("-password").session(session);

        // C. Calculate Token Number securely (transaction lock prevents races)
        const lastAppt = await appointmentModel.findOne({ docId, slotDate }).sort({ tokenNumber: -1 }).session(session);
        const newToken = (lastAppt?.tokenNumber || 0) + 1;

        // D. Create permanent Appointment document
        const { slots_booked: _, ...cleanDocData } = docData.toObject();
        const newAppointment = new appointmentModel({
          _id,
          userId,
          docId,
          userData,
          docData: cleanDocData,
          amount: docData.fees,
          slotTime,
          slotDate,
          date: Date.now(),
          tokenNumber: newToken,
          payment: false,
          status: "pending" // Or "confirmed" based on business logic
        });

        await newAppointment.save({ session });
      });

      // Phase 5: Real-Time Telemetry & Notification
      // Since this is a separate worker process, we publish to Redis for the main Express app's Socket.io to pick up
      await connection.publish("booking_updates", JSON.stringify({
        type: "slot-removed",
        room: `doctor_${docId}`,
        payload: { slotDate, slotTime, docId }
      }));
      
      await connection.publish("booking_updates", JSON.stringify({
        type: "booking-confirmed",
        room: `job_${_id}`,
        payload: { appointmentId: _id, slotDate, slotTime }
      }));

    } catch (error) {
      // Compensating Transaction: Release the Redis lock to put the slot back on the market
      console.error(`[Transaction Failed] Releasing lock for ${lockKey} due to error:`, error.message);
      await connection.del(lockKey).catch(() => {});
      throw error; // Rethrow to trigger BullMQ exponential backoff
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
