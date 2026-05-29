import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Trash2, Video } from "lucide-react";
import { deleteVideo, fetchVideos } from "./api.js";

const statusStyles = {
  INDEXED: "bg-emerald-50 text-emerald-700",
  INDEXING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
  PENDING: "bg-slate-100 text-slate-600",
};

export default function VideoList({
  selectedVideoId,
  onSelect,
  refreshKey,
  relatedMarkerId,
  selectable = true,
}) {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadVideos() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchVideos({ relatedMarkerId });

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
  }, [refreshKey, relatedMarkerId]);

  async function handleDelete(video) {
    const shouldDelete = window.confirm(`Xóa video "" from the indexed list? Related transcript chunks and chat history will also be deleted.`);

    if (!shouldDelete) {
      return;
    }

    setDeletingVideoId(video._id);
    setError("");

    try {
      await deleteVideo(video._id);
      setVideos((currentVideos) => currentVideos.filter((currentVideo) => currentVideo._id !== video._id));

      if (selectedVideoId === video._id) {
        onSelect?.(null);
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setDeletingVideoId("");
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-950">Video đã index</h3>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      {error ? (
        <p className="mt-4 flex gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {!isLoading && videos.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có video nào.</div>
        ) : null}

        {videos.map((video) => {
          const isDeleting = deletingVideoId === video._id;

          return (
          <div
            key={video._id}
            onClick={() => {
              if (selectable) {
                onSelect?.(video);
              }
            }}
            role={selectable ? "button" : undefined}
            tabIndex={selectable ? 0 : undefined}
            onKeyDown={(event) => {
              if (!selectable || (event.key !== "Enter" && event.key !== " ")) {
                return;
              }

              event.preventDefault();
              onSelect?.(video);
            }}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selectedVideoId === video._id
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-800"
            } ${selectable ? "hover:bg-white" : "cursor-default"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{video.title}</p>
                <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[video.status] || statusStyles.PENDING}`}>
                  {video.status === "INDEXED" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  {video.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {video.totalChunks || 0} chunks
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(video);
                  }}
                  disabled={isDeleting}
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Xóa video"
                  aria-label={`Xóa video ${video.title}`}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {video.relatedMarkerId ? (
              <p className="mt-3 text-xs text-slate-500">Marker: {video.relatedMarkerId}</p>
            ) : null}
          </div>
          );
        })}
      </div>
    </section>
  );
}
