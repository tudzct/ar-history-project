import { YoutubeTranscript } from "youtube-transcript";
import { AppError } from "../utils/AppError.js";

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function detectTimeScale(rawTranscript) {
  const durations = rawTranscript
    .map((item) => Number(item.duration ?? item.dur))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (durations.length === 0) {
    return 1;
  }

  const maxDuration = Math.max(...durations);

  return maxDuration > 100 ? 1000 : 1;
}

function toSeconds(value, scale) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return numberValue / scale;
}

function normalizeTranscriptItem(item, scale) {
  const start = toSeconds(item.start ?? item.offset ?? item.startTime ?? 0, scale);
  const duration = toSeconds(item.duration ?? item.dur ?? 0, scale);
  const text = decodeHtmlEntities(item.text).replace(/\s+/g, " ").trim();

  return {
    start,
    duration,
    end: start + duration,
    text,
  };
}

export async function fetchTranscriptByVideoId(youtubeVideoId) {
  if (!YoutubeTranscript?.fetchTranscript) {
    throw new AppError("youtube-transcript package is not available.", 500);
  }

  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(youtubeVideoId);
    const timeScale = detectTimeScale(rawTranscript);
    const transcript = rawTranscript.map((item) => normalizeTranscriptItem(item, timeScale)).filter((item) => item.text);

    if (transcript.length === 0) {
      throw new AppError("Video does not have a readable transcript.", 422);
    }

    return transcript;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Could not fetch transcript for this YouTube video. Make sure captions/subtitles are available.",
      422,
      error.message
    );
  }
}
