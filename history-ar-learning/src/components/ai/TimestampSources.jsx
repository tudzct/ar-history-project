import { Clock3 } from "lucide-react";

export default function TimestampNguồn({ sources, onJump }) {
  if (!sources?.length) {
    return null;
  }

  const limitedNguồn = sources.slice(0, 3);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Nguồn</p>
      <div className="flex flex-wrap gap-2">
        {limitedNguồn.map((source) => (
          <button
            key={`${source.chunkId}-${source.startTime}`}
            type="button"
            onClick={() => onJump(source.startTime)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
            title={source.text}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {source.formattedStart} - {source.formattedEnd}
          </button>
        ))}
      </div>
    </div>
  );
}
