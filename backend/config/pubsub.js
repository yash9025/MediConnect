import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const retryStrategy = (times) => {
  // Retry silently in the background every 10 seconds
  return Math.min(times * 2000, 10000);
};

const redisOptions = {
  retryStrategy,
  maxRetriesPerRequest: null,
  family: 0,
  tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};

// Create dedicated connections for Pub/Sub
export const redisPublisher = new Redis(REDIS_URL, redisOptions);
export const redisSubscriber = new Redis(REDIS_URL, redisOptions);

redisPublisher.on('error', (err) => { if (err.code !== 'ECONNREFUSED') console.warn('Redis Publisher warning:', err.message) });
redisSubscriber.on('error', (err) => { if (err.code !== 'ECONNREFUSED') console.warn('Redis Subscriber warning:', err.message) });
