import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

export const NO_INFORMATION_ANSWER = "Mình không tìm thấy thông tin này trong video.";

export async function createEmbedding(text) {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    throw new AppError("Cannot create embedding for empty text.", 400);
  }

  const response = await ai.models.embedContent({
    model: env.geminiEmbeddingModel,
    contents: normalizedText,
  });

  const embedding =
    response.embeddings?.[0]?.values ||
    response.embedding?.values ||
    response.embeddings?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new AppError("Gemini did not return a valid embedding.", 502);
  }

  return embedding;
}

function readGeminiText(response) {
  if (typeof response.text === "function") {
    return response.text();
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  return response.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
}

export async function generateAnswer(prompt) {
  const response = await ai.models.generateContent({
    model: env.geminiGenerationModel,
    contents: prompt,
    config: {
      temperature: env.geminiTemperature,
    },
  });

  const answer = readGeminiText(response).trim();

  if (!answer) {
    throw new AppError("Gemini did not return an answer.", 502);
  }

  return answer;
}

function readChunkText(chunk) {
  if (!chunk) {
    return "";
  }

  if (typeof chunk.text === "string") {
    return chunk.text;
  }

  if (typeof chunk.text === "function") {
    return chunk.text();
  }

  return chunk.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
}

export async function generateAnswerStream(prompt, onChunk) {
  const stream = await ai.models.generateContentStream({
    model: env.geminiGenerationModel,
    contents: prompt,
    config: {
      temperature: env.geminiTemperature,
    },
  });

  let answer = "";

  for await (const chunk of stream) {
    const text = readChunkText(chunk);
    if (!text) {
      continue;
    }

    answer += text;
    onChunk(text);
  }

  const normalized = answer.trim();

  if (!normalized) {
    throw new AppError("Gemini did not return an answer.", 502);
  }

  return normalized;
}

export function buildVideoAnswerPrompt(question, sources) {
  const context = sources
    .map(
      (source, index) => `[Source ${index + 1}]
Time: ${source.formattedStart} - ${source.formattedEnd}
Transcript:
${source.text}`
    )
    .join("\n\n");

  return `Bạn là trợ lý học lịch sử trong ứng dụng History AR Learning.
Người dùng đang học lịch sử thông qua video và bản đồ AR.

Quy tắc:
- Chỉ trả lời dựa trên transcript video được cung cấp.
- Không tự bịa thêm thông tin ngoài transcript.
- Nếu transcript không có thông tin để trả lời, hãy nói: "${NO_INFORMATION_ANSWER}"
- Trả lời bằng tiếng Việt.
- Giải thích rõ ràng, dễ hiểu cho học sinh/sinh viên.
- Nếu câu hỏi liên quan đến nhân vật, địa điểm, nguyên nhân, diễn biến, kết quả hoặc ý nghĩa lịch sử, hãy trình bày có cấu trúc.
- Cuối câu trả lời, liệt kê các mốc thời gian liên quan.

${context}

Question:
${question}`;
}
