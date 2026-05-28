import dotenv from "dotenv";

dotenv.config();

const requiredKeys = [
  "MONGO_URI",
  "GEMINI_API_KEY",
  "GEMINI_GENERATION_MODEL",
  "GEMINI_EMBEDDING_MODEL",
  "FRONTEND_URL",
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
}

function readNumber(key, fallback, { min } = {}) {
  const rawValue = process.env[key];
  const value = rawValue === undefined || rawValue === "" ? fallback : Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`Environment variable ${key} must be >= ${min}.`);
  }

  return value;
}

export const env = {
  port: readNumber("PORT", 3000, { min: 1 }),
  mongoUri: process.env.MONGO_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiGenerationModel: process.env.GEMINI_GENERATION_MODEL,
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
  geminiTemperature: readNumber("GEMINI_TEMPERATURE", 0.2, { min: 0 }),
  frontendUrl: process.env.FRONTEND_URL,
  chunkSeconds: readNumber("CHUNK_SECONDS", 90, { min: 1 }),
  overlapSeconds: readNumber("OVERLAP_SECONDS", 15, { min: 0 }),
  topK: readNumber("TOP_K", 5, { min: 1 }),
  maxQuestionLength: readNumber("MAX_QUESTION_LENGTH", 1000, { min: 1 }),
  minRelevanceScore: readNumber("MIN_RELEVANCE_SCORE", 0.2, { min: -1 }),
  embeddingRetryCount: readNumber("EMBEDDING_RETRY_COUNT", 2, { min: 0 }),
};

if (env.overlapSeconds >= env.chunkSeconds) {
  throw new Error("OVERLAP_SECONDS must be lower than CHUNK_SECONDS.");
}
