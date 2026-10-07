/**
 * Shared model rotation config.
 * Priority order: newest/least-saturated → stable fallbacks
 * All models confirmed available on this API key.
 */
export const MODEL_ROTATION = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

/**
 * Creates a ChatGoogleGenerativeAI instance with auto-fallback across MODEL_ROTATION.
 * On 503/429, transparently switches to the next model in the list.
 *
 * @param {import("@langchain/google-genai").ChatGoogleGenerativeAIInput} baseOptions
 * @returns {object} A proxy object with .invoke() that auto-rotates on overload
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

export function createResilientLLM(baseOptions = {}) {
  const models = MODEL_ROTATION;

  const isOverloadError = (err) => {
    const msg = String(err?.message || "");
    return (
      err?.status === 503 ||
      err?.status === 429 ||
      msg.includes("503") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("Service Unavailable")
    );
  };

  return {
    async invoke(messages) {
      for (const modelName of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const llm = new ChatGoogleGenerativeAI({
              ...baseOptions,
              model: modelName,
              apiKey: process.env.GEMINI_API_KEY,
              maxRetries: 0, // CRITICAL: Disable LangChain internal exponential backoff so we handle it
            });
            const result = await llm.invoke(messages);
            if (modelName !== models[0] || attempt > 0) {
              console.log(`[ModelRotation] Succeeded with ${modelName} on attempt ${attempt + 1}`);
            }
            return result;
          } catch (err) {
            const s = err?.status;
            if (s === 503 || s === 429 || isOverloadError(err)) {
              console.warn(`[ModelRotation] ${modelName} overloaded (${s}), retrying attempt ${attempt + 1}/3...`);
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
              continue; // Retry same model
            }
            if (s === 404) {
              console.warn(`[ModelRotation] ${modelName} not found (404), skipping to next model.`);
              break; // Skip to next model
            }
            console.error(`[ModelRotation] FATAL ERROR on ${modelName} (${s}):`, err?.message);
            throw err; // Real error (bad key, etc)
          }
        }
      }
      throw new Error("All models unavailable");
    }
  };
}
