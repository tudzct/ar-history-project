import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TranscriptChunk",
      required: true,
    },
    startTime: Number,
    endTime: Number,
    formattedStart: String,
    formattedEnd: String,
    text: String,
    score: Number,
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["USER", "ASSISTANT"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    sources: {
      type: [sourceSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
