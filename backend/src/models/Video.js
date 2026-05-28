import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    youtubeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    youtubeVideoId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "INDEXING", "INDEXED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    transcriptLanguage: {
      type: String,
      trim: true,
      default: "",
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
    relatedMarkerId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    relatedTimelineSegmentId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
  },
  { timestamps: true }
);

export const Video = mongoose.model("Video", videoSchema);
