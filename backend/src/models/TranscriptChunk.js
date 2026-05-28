import mongoose from "mongoose";

const transcriptChunkSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Number,
      required: true,
    },
    endTime: {
      type: Number,
      required: true,
    },
    formattedStart: {
      type: String,
      required: true,
    },
    formattedEnd: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    embedding: {
      type: [Number],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

transcriptChunkSchema.index({ videoId: 1, chunkIndex: 1 }, { unique: true });

export const TranscriptChunk = mongoose.model("TranscriptChunk", transcriptChunkSchema);
