"use client";

type QuestProgressPillProps = {
  completedCount: number;
  totalCount: number;
  visible: boolean;
};

export function QuestProgressPill({
  completedCount,
  totalCount,
  visible,
}: QuestProgressPillProps) {
  if (!visible || totalCount <= 0) return null;

  const progress = Math.min(completedCount / totalCount, 1);

  return (
    <a
      href="/misiones"
      className="fixed bottom-20 right-6 z-40 flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur transition-all hover:scale-105 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/95"
    >
      <span className="material-symbols-outlined text-base text-primary">
        map
      </span>

      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-bold text-slate-900 dark:text-white">
          Forging Your Path: {completedCount}/{totalCount}
        </span>

        {/* Mini progress bar */}
        <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </a>
  );
}
