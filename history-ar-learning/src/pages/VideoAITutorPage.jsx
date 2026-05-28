import { useState } from "react";
import { Filter, ShieldUser } from "lucide-react";
import VideoIndexer from "../components/ai/VideoIndexer.jsx";
import VideoList from "../components/ai/VideoList.jsx";

export default function VideoAITutorPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [relatedMarkerId, setRelatedMarkerId] = useState("");

  function handleIndexed() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-slate-950">
              <ShieldUser className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Admin Zone</p>
              <h2 className="mt-1 text-3xl font-black">Quản trị nguồn video AI</h2>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 md:w-80">
            <Filter className="h-4 w-4 text-slate-300" />
            <input
              value={relatedMarkerId}
              onChange={(event) => setRelatedMarkerId(event.target.value)}
              placeholder="Lọc marker, ví dụ: him-lam"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
        Tab này dành cho Admin: chỉ import/index URL video và quản lý danh sách video đã index.
      </p>

      <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <VideoIndexer onIndexed={handleIndexed} />
        <VideoList
          selectedVideoId=""
          onSelect={undefined}
          refreshKey={refreshKey}
          relatedMarkerId={relatedMarkerId.trim()}
          selectable={false}
        />
      </div>
    </div>
  );
}
