import { COMMIT_SHA } from "@/lib/version";

export function VersionBadge() {
  return (
    <div className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-600">
      {COMMIT_SHA}
    </div>
  );
}
