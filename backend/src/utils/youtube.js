import { AppError } from "./AppError.js";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== "string") {
    throw new AppError("youtubeUrl is required.", 400);
  }

  const trimmedInput = input.trim();

  if (YOUTUBE_ID_PATTERN.test(trimmedInput)) {
    return trimmedInput;
  }

  let url;

  try {
    url = new URL(trimmedInput);
  } catch {
    throw new AppError("Invalid YouTube URL.", 400);
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new AppError("Only YouTube URLs are supported.", 400);
  }

  const watchId = url.searchParams.get("v");

  if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) {
    return watchId;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const candidate = url.hostname.includes("youtu.be")
    ? parts[0]
    : parts.find((part, index) => ["embed", "shorts", "live"].includes(parts[index - 1]));

  if (candidate && YOUTUBE_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  throw new AppError("Could not extract a valid YouTube video ID.", 400);
}

export function isValidYouTubeUrl(input) {
  try {
    extractYouTubeVideoId(input);
    return true;
  } catch {
    return false;
  }
}
