import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { Resend } from "resend";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    const { appointmentId } = job.data;
    
    // Get appointment details
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    // Get user details
    const user = await userModel.findById(appointment.userId);
    if (!user) {
      throw new Error(`User not found for appointment: ${appointmentId}`);
    }

    // Check if email already sent (Idempotency)
    // For simplicity, we assume we don't have an `emailSent` flag right now,
    // so we can just send it, or we could add `emailSent` to appointmentModel.
    // We'll update the appointment to track email status to be safe.
    if (appointment.emailSent === true) {
       console.log(`Email already sent for appointment ${appointmentId}. Ignoring duplicate event.`);
       return { success: true, message: "Email already sent" };
    }

    const { docData, slotDate, slotTime } = appointment;

    console.log(`Sending confirmation email to ${user.email} for appointment ${appointmentId}`);
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "MediConnect <noreply@mediconnect.com>", // Make sure to use a verified domain in production
      to: [user.email],
      subject: "Appointment Confirmed - MediConnect",
      html: `
        <h2>Appointment Confirmed!</h2>
        <p>Dear ${user.name},</p>
        <p>Your appointment with <strong>${docData.name}</strong> has been confirmed.</p>
        <p><strong>Date:</strong> ${slotDate}</p>
        <p><strong>Time:</strong> ${slotTime}</p>
        <br/>
        <p>Thank you for choosing MediConnect.</p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Mark as email sent to ensure idempotency
    appointment.emailSent = true;
    await appointment.save();

    console.log(`Email successfully sent for appointment ${appointmentId}`);
    return { success: true, messageId: data.id };
  },
  { 
    connection,
    metrics: { maxDataPoints: 0 },
    skipStalledCheck: true,
    drainDelay: 300000 
  }
);
