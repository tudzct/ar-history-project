import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatWithVideo, chatWithVideoStream, getMessagesForVideo } from "../services/chatService.js";

function assertValidObjectId(videoId) {
  if (!mongoose.isValidObjectId(videoId)) {
    throw new AppError("Invalid videoId.", 400);
  }
}

export const chat = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.videoId);

  if (req.query.stream === "1") {
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const writeEvent = (event) => {
      res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      const result = await chatWithVideoStream(req.params.videoId, req.body.question, (chunk) => {
        writeEvent({ type: "chunk", content: chunk });
      });

      writeEvent({
        type: "done",
        answer: result.answer,
        sources: result.sources || [],
      });
      res.end();
      return;
    } catch (error) {
      writeEvent({ type: "error", message: error.message || "Không thể phản hồi realtime." });
      res.end();
      return;
    }
  }

  const result = await chatWithVideo(req.params.videoId, req.body.question);

  res.json(result);
});

export const getMessages = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.videoId);

  const messages = await getMessagesForVideo(req.params.videoId);

  res.json({ messages });
});
