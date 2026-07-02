import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import razorpay from "razorpay";
import { enqueueBookingSuccess } from "./bookingSuccessQueue.js";
import { enqueueEmail } from "./emailQueue.js";

// Initialize razorpay instance
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const paymentWorker = new Worker(
  "payment-queue",
  async (job) => {
    const { razorpay_order_id } = job.data;
    
    // Fetch order from Razorpay
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

    if (orderInfo.status === "paid") {
      const appointmentId = orderInfo.receipt;
      
      console.log(`Payment successful for order ${razorpay_order_id}, appointment ${appointmentId}. Fanning out events.`);
      
      // Fan-out: Push to Booking Success Queue
      await enqueueBookingSuccess({ appointmentId });
      
      // Fan-out: Push to Email Queue
      await enqueueEmail({ appointmentId });
      
      return { success: true, message: "Payment verified and events fanned out" };
    } else {
      throw new Error(`Payment not yet paid. Current status: ${orderInfo.status}`);
    }
  },
  { 
    connection,
    metrics: { maxDataPoints: 0 },
    skipStalledCheck: true,
    drainDelay: 300000 
  }
);
