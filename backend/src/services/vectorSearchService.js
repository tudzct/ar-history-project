import { TranscriptChunk } from "../models/TranscriptChunk.js";
import { AppError } from "../utils/AppError.js";
import { cosineSimilarity } from "../utils/cosineSimilarity.js";

export async function searchRelevantChunks(videoId, questionEmbedding, topK) {
  const chunks = await TranscriptChunk.find({ videoId }).sort({ chunkIndex: 1 }).lean();

  if (chunks.length === 0) {
    throw new AppError("This video has no transcript chunks. Please index it again.", 422);
  }

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(questionEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
