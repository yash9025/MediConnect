import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

// Worker for processing new bookings
export const bookingWorker = new Worker(
  "booking-queue",
  async (job) => {
    const { appointmentData } = job.data;
    
    // Create new appointment doc
    const newAppointment = new appointmentModel({
      ...appointmentData,
      payment: false,
      status: "pending"
    });

    await newAppointment.save();
    return { success: true, appointmentId: newAppointment._id };
  },
  { connection }
);

// Rollback mechanism: if job fails permanently, release the slot
bookingWorker.on("failed", async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`Booking job ${job.id} failed permanently. Rolling back slot.`, err);
    try {
      const { docId, slotDate, slotTime } = job.data.appointmentData;
      const doctorData = await doctorModel.findById(docId);
      
      if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
        doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter(e => e !== slotTime);
        doctorData.markModified('slots_booked');
        await doctorData.save();
        console.log(`Successfully rolled back slot for docId: ${docId}, date: ${slotDate}, time: ${slotTime}`);
      }
    } catch (rollbackErr) {
      console.error("Failed to rollback doctor slot:", rollbackErr);
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
  { connection }
);
