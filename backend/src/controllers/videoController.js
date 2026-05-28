import mongoose from "mongoose";
import { Video } from "../models/Video.js";
import { TranscriptChunk } from "../models/TranscriptChunk.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidYouTubeUrl } from "../utils/youtube.js";
import { indexVideo as indexVideoService } from "../services/videoIndexingService.js";

function assertValidObjectId(videoId) {
  if (!mongoose.isValidObjectId(videoId)) {
    throw new AppError("Invalid videoId.", 400);
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const indexVideo = asyncHandler(async (req, res) => {
  const youtubeUrl = cleanString(req.body.youtubeUrl);

  if (!youtubeUrl) {
    throw new AppError("youtubeUrl is required.", 400);
  }

  if (!isValidYouTubeUrl(youtubeUrl)) {
    throw new AppError("youtubeUrl must be a valid YouTube URL.", 400);
  }

  const result = await indexVideoService({
    youtubeUrl,
    title: cleanString(req.body.title),
    description: cleanString(req.body.description),
    relatedMarkerId: cleanString(req.body.relatedMarkerId),
    relatedTimelineSegmentId: cleanString(req.body.relatedTimelineSegmentId),
  });

  res.status(result.reused ? 200 : 201).json({
    message: result.reused ? "Video already indexed" : "Video indexed successfully",
    video: result.video,
  });
});

export const listVideos = asyncHandler(async (req, res) => {
  const filter = {};
  const relatedMarkerId = cleanString(req.query.relatedMarkerId);

  if (relatedMarkerId) {
    filter.relatedMarkerId = relatedMarkerId;
  }

  const videos = await Video.find(filter).sort({ createdAt: -1 }).lean();

  res.json({ videos });
});

export const getVideo = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.videoId);

  const video = await Video.findById(req.params.videoId).lean();

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  res.json({ video });
});

export const getVideoChunks = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.videoId);

  const video = await Video.findById(req.params.videoId).lean();

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  const chunks = await TranscriptChunk.find({ videoId: video._id })
    .select("-embedding")
    .sort({ chunkIndex: 1 })
    .lean();

  res.json({ chunks });
});

export const deleteVideo = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.videoId);

  const video = await Video.findById(req.params.videoId);

  if (!video) {
    throw new AppError("Video not found.", 404);
  }

  await TranscriptChunk.deleteMany({ videoId: video._id });
  await ChatMessage.deleteMany({ videoId: video._id });
  await video.deleteOne();

  res.json({ message: "Video, transcript chunks and chat history deleted successfully." });
});
