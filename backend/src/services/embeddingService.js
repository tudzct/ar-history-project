import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { createEmbedding } from "./geminiService.js";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createEmbeddingWithRetry(text) {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    throw new AppError("Cannot create embedding for empty text.", 400);
  }

  let lastError;

  for (let attempt = 0; attempt <= env.embeddingRetryCount; attempt += 1) {
    try {
      return await createEmbedding(normalizedText);
    } catch (error) {
      lastError = error;

      if (attempt < env.embeddingRetryCount) {
        await wait(500 * (attempt + 1));
      }
    }
  }

  throw new AppError("Gemini embedding request failed.", 502, lastError?.message);
}

export async function createChunkEmbeddings(chunks) {
  const embeddedChunks = [];

  for (const chunk of chunks) {
    const embedding = await createEmbeddingWithRetry(chunk.text);
    embeddedChunks.push({ ...chunk, embedding });
  }

  return embeddedChunks;
}

export async function createQuestionEmbedding(question) {
  return createEmbeddingWithRetry(question);
}
