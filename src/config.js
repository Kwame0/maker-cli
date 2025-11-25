import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of this config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from src/)
dotenv.config({ path: join(__dirname, "..", ".env") });

export const CONFIG = {
  API_KEY: process.env.GEMINI_API_KEY,
  MODEL_NAME: "gemini-flash-lite-latest",
  VOTE_MARGIN_K: 10, // Votes ahead to win (higher = more confident)
  MAX_ATTEMPTS_PER_STEP: 15,

  // Speed Optimization Settings
  MAX_RPM: 3500, // Maximum requests per minute (flash-lite: 4000 RPM, using 3500 for safety)
  BATCH_SIZE: 50, // Number of agents to run in parallel per batch
  ENABLE_PARALLEL: true, // Enable parallel consensus voting
  EARLY_TERMINATION: true, // Stop voting as soon as K margin is reached

  // Development Settings
  DEV_MODE: process.env.DEV_MODE === "true", // Enable detailed error logging (set DEV_MODE=true in .env)
};
