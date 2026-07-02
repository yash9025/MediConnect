import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Default to a local Redis for development if REDIS_URL is not set
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Edge Case: BullMQ requires maxRetriesPerRequest to be null
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, 
  retryStrategy(times) {
    // Retry silently in the background every 10 seconds to prevent BullMQ/PubSub from crashing
    return Math.min(times * 2000, 10000);
  }
});

connection.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') {
    console.warn('Redis connection warning:', err.message);
  }
});
