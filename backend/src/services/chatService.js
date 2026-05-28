import { env } from "../config/env.js";
import { Video } from "../models/Video.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { AppError } from "../utils/AppError.js";
import { createQuestionEmbedding } from "./embeddingService.js";
import { searchRelevantChunks } from "./vectorSearchService.js";
import { buildVideoAnswerPrompt, generateAnswer, generateAnswerStream, NO_INFORMATION_ANSWER } from "./geminiService.js";

function toSource(chunk) {
  return {
    chunkId: chunk._id,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    formattedStart: chunk.formattedStart,
    formattedEnd: chunk.formattedEnd,
    text: chunk.text,
    score: Number(chunk.score.toFixed(4)),
  };
}

export async function chatWithVideo(videoId, question) {
  const normalizedQuestion = String(question || "").trim();

  if (!normalizedQuestion) {
    throw new AppError("question is required.", 400);
  }

  if (normalizedQuestion.length > env.maxQuestionLength) {
    throw new AppError(`question must be ${env.maxQuestionLength} characters or fewer.`, 400);
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  if (video.status !== "INDEXED") {
    throw new AppError("Video has not finished indexing yet. Please index the video before chatting.", 409, {
      status: video.status,
      errorMessage: video.errorMessage,
    });
  }

  await ChatMessage.create({
    videoId: video._id,
    role: "USER",
    content: normalizedQuestion,
  });

  const questionEmbedding = await createQuestionEmbedding(normalizedQuestion);
  const topChunks = await searchRelevantChunks(video._id, questionEmbedding, env.topK);
  const relevantChunks = topChunks.filter((chunk) => chunk.score >= env.minRelevanceScore);
  const sources = relevantChunks.map(toSource);

  let answer = NO_INFORMATION_ANSWER;

  if (sources.length > 0) {
    const prompt = buildVideoAnswerPrompt(normalizedQuestion, sources);
    answer = await generateAnswer(prompt);
  }

  const assistantMessage = await ChatMessage.create({
    videoId: video._id,
    role: "ASSISTANT",
    content: answer,
    sources,
  });

  return {
    answer,
    sources: assistantMessage.sources,
  };
}

export async function chatWithVideoStream(videoId, question, onChunk) {
  const normalizedQuestion = String(question || "").trim();

  if (!normalizedQuestion) {
    throw new AppError("question is required.", 400);
  }

  if (normalizedQuestion.length > env.maxQuestionLength) {
    throw new AppError(`question must be ${env.maxQuestionLength} characters or fewer.`, 400);
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  if (video.status !== "INDEXED") {
    throw new AppError("Video has not finished indexing yet. Please index the video before chatting.", 409, {
      status: video.status,
      errorMessage: video.errorMessage,
    });
  }

  await ChatMessage.create({
    videoId: video._id,
    role: "USER",
    content: normalizedQuestion,
  });

  const questionEmbedding = await createQuestionEmbedding(normalizedQuestion);
  const topChunks = await searchRelevantChunks(video._id, questionEmbedding, env.topK);
  const relevantChunks = topChunks.filter((chunk) => chunk.score >= env.minRelevanceScore);
  const sources = relevantChunks.map(toSource);

  let answer = NO_INFORMATION_ANSWER;

  if (sources.length > 0) {
    const prompt = buildVideoAnswerPrompt(normalizedQuestion, sources);
    answer = await generateAnswerStream(prompt, onChunk);
  } else {
    onChunk(answer);
  }

  const assistantMessage = await ChatMessage.create({
    videoId: video._id,
    role: "ASSISTANT",
    content: answer,
    sources,
  });

  return {
    answer,
    sources: assistantMessage.sources,
  };
}

export async function getMessagesForVideo(videoId) {
  const video = await Video.exists({ _id: videoId });

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  return ChatMessage.find({ videoId }).sort({ createdAt: 1 }).lean();
}
