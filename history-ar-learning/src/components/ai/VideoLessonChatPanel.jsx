import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bot, Loader2 } from "lucide-react";
import { fetchVideos } from "./api.js";
import VideoChatPanel from "./VideoChatPanel.jsx";

function extractYouTubeVideoId(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsed.pathname.replace("/", "").trim();
    }

    if (hostname.includes("youtube.com")) {
      const embedPath = parsed.pathname.match(/\/embed\/([^/?]+)/);

      if (embedPath?.[1]) {
        return embedPath[1];
      }

      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
}

export default function VideoLessonChatPanel({ youtubeUrl, onJumpToTime }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [videos, setVideos] = useState([]);

  const currentVideoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);
  const selectedVideo = useMemo(
    () => videos.find((video) => video.youtubeVideoId === currentVideoId) || null,
    [videos, currentVideoId]
  );

  useEffect(() => {
    let ignore = false;

    async function loadVideos() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchVideos();

        if (!ignore) {
          setVideos(data.videos || []);
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError.message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadVideos();

    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải dữ liệu chatbot cho video...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="flex gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      </section>
    );
  }

  if (!selectedVideo) {
    return (
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950">Chatbot chưa sẵn sàng cho video này</h3>
            <p className="mt-1 text-sm text-slate-600">
              Video hiện tại chưa được index transcript. Vào tab AI Chatbot (Admin) để import URL trước.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <VideoChatPanel selectedVideo={selectedVideo} onJump={onJumpToTime} hidePlayer />;
}
