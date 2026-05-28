import { useState } from "react";
import { Loader2, PlaySquare, UploadCloud } from "lucide-react";
import { indexVideo } from "./api.js";

export default function VideoIndexer({ onIndexed }) {
  const [form, setForm] = useState({
    youtubeUrl: "",
    title: "",
    description: "",
    relatedMarkerId: "",
    relatedTimelineSegmentId: "",
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsIndexing(true);

    try {
      const data = await indexVideo(form);
      setSuccess(data.message || "Video indexed successfully");
      onIndexed?.(data.video);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsIndexing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white">
          <PlaySquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950">Index video YouTube</h3>
          <p className="text-xs text-slate-500">Transcript sẽ được lưu để chatbot tra cứu.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <input
          value={form.youtubeUrl}
          onChange={(event) => updateField("youtubeUrl", event.target.value)}
          placeholder="YouTube URL"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          required
        />
        <input
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Tiêu đề video"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          required
        />
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Mô tả ngắn"
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.relatedMarkerId}
            onChange={(event) => updateField("relatedMarkerId", event.target.value)}
            placeholder="relatedMarkerId, ví dụ: him-lam"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />
          <input
            value={form.relatedTimelineSegmentId}
            onChange={(event) => updateField("relatedTimelineSegmentId", event.target.value)}
            placeholder="relatedTimelineSegmentId"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>
      </div>

      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {success ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={isIndexing}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isIndexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {isIndexing ? "Đang index..." : "Index Video"}
      </button>
    </form>
  );
}
