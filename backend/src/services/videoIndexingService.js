import { Video } from "../models/Video.js";
import { TranscriptChunk } from "../models/TranscriptChunk.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { AppError } from "../utils/AppError.js";
import { extractYouTubeVideoId } from "../utils/youtube.js";
import { fetchTranscriptByVideoId } from "./youtubeTranscriptService.js";
import { createTranscriptChunks } from "./chunkService.js";
import { createChunkEmbeddings } from "./embeddingService.js";

function cleanOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function indexVideo({
  youtubeUrl,
  title,
  description = "",
  relatedMarkerId = "",
  relatedTimelineSegmentId = "",
}) {
  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
  let video = await Video.findOne({ youtubeVideoId });

  if (video?.status === "INDEXED") {
    return { video, reused: true };
  }

  if (video?.status === "INDEXING") {
    throw new AppError("Video is already being indexed. Please wait until indexing finishes.", 409);
  }

  if (!video) {
    video = await Video.create({
      title: cleanOptionalString(title) || `YouTube video ${youtubeVideoId}`,
      description: cleanOptionalString(description),
      youtubeUrl,
      youtubeVideoId,
      status: "INDEXING",
      relatedMarkerId: cleanOptionalString(relatedMarkerId),
      relatedTimelineSegmentId: cleanOptionalString(relatedTimelineSegmentId),
    });
  } else {
    video.title = cleanOptionalString(title) || video.title;
    video.description = cleanOptionalString(description);
    video.youtubeUrl = youtubeUrl;
    video.status = "INDEXING";
    video.errorMessage = "";
    video.totalChunks = 0;
    video.relatedMarkerId = cleanOptionalString(relatedMarkerId) || video.relatedMarkerId;
    video.relatedTimelineSegmentId =
      cleanOptionalString(relatedTimelineSegmentId) || video.relatedTimelineSegmentId;
    await video.save();
  }

  try {
    await TranscriptChunk.deleteMany({ videoId: video._id });
    await ChatMessage.deleteMany({ videoId: video._id });

    const transcript = await fetchTranscriptByVideoId(youtubeVideoId);
    const chunks = createTranscriptChunks(transcript);

    if (chunks.length === 0) {
      throw new AppError("Transcript was fetched, but no non-empty chunks could be created.", 422);
    }

    const embeddedChunks = await createChunkEmbeddings(chunks);

    await TranscriptChunk.insertMany(
      embeddedChunks.map((chunk) => ({
        ...chunk,
        videoId: video._id,
      }))
    );

    video.status = "INDEXED";
    video.transcriptLanguage = "";
    video.totalChunks = embeddedChunks.length;
    video.errorMessage = "";
    await video.save();

    return { video, reused: false };
  } catch (error) {
    video.status = "FAILED";
    video.errorMessage = error.message;
    video.totalChunks = 0;
    await video.save();
    throw error;
  }
}
