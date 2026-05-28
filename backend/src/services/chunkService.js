import { env } from "../config/env.js";
import { formatSeconds } from "../utils/time.js";

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function createTranscriptChunks(
  transcript,
  chunkSeconds = env.chunkSeconds,
  overlapSeconds = env.overlapSeconds
) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return [];
  }

  const sortedTranscript = [...transcript].sort((a, b) => a.start - b.start);
  const firstStart = sortedTranscript[0].start;
  const lastEnd = Math.max(...sortedTranscript.map((item) => item.end));
  const stepSeconds = chunkSeconds - overlapSeconds;
  const chunks = [];

  let chunkIndex = 0;

  for (let windowStart = firstStart; windowStart < lastEnd; windowStart += stepSeconds) {
    const windowEnd = windowStart + chunkSeconds;
    const lines = sortedTranscript.filter((item) => item.end > windowStart && item.start < windowEnd);
    const text = normalizeText(lines.map((item) => item.text).join(" "));

    if (!text) {
      continue;
    }

    const startTime = Math.min(...lines.map((item) => item.start));
    const endTime = Math.max(...lines.map((item) => item.end));

    chunks.push({
      chunkIndex,
      startTime,
      endTime,
      formattedStart: formatSeconds(startTime),
      formattedEnd: formatSeconds(endTime),
      text,
    });

    chunkIndex += 1;
  }

  return chunks;
}
