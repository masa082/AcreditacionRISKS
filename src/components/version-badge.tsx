import { COMMIT_SHA, COMMIT_URL } from "@/lib/version";

export function VersionBadge() {
  return (
    <a
      href={COMMIT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-600 hover:border-slate-300 hover:bg-slate-100 transition"
      title={`Commit: ${COMMIT_SHA}`}
    >
      v{COMMIT_SHA}
    </a>
  );
}
