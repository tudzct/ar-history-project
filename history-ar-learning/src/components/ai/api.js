const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL chưa được cấu hình trong frontend .env.");
  }

  return API_BASE_URL.replace(/\/$/, "");
}

async function request(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể gọi API AI chatbot.");
  }

  return data;
}

export function indexVideo(payload) {
  return request("/videos/index", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchVideos({ relatedMarkerId } = {}) {
  const query = relatedMarkerId ? `?relatedMarkerId=${encodeURIComponent(relatedMarkerId)}` : "";
  return request(`/videos${query}`);
}

export function deleteVideo(videoId) {
  return request(`/videos/${videoId}`, {
    method: "DELETE",
  });
}

export function fetchMessages(videoId) {
  return request(`/videos/${videoId}/messages`);
}

export function chatWithVideo(videoId, question) {
  return request(`/videos/${videoId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function chatWithVideoStream(videoId, question, handlers = {}) {
  const response = await fetch(`${getApiBaseUrl()}/videos/${videoId}/chat?stream=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Không thể gọi API AI chatbot.");
  }

  if (!response.body) {
    throw new Error("Trình duyệt không hỗ trợ stream phản hồi.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const event = JSON.parse(line);

      if (event.type === "chunk") {
        handlers.onChunk?.(event.content || "");
      } else if (event.type === "done") {
        handlers.onDone?.(event);
      } else if (event.type === "error") {
        throw new Error(event.message || "Không thể phản hồi realtime.");
      }
    }
  }
}
