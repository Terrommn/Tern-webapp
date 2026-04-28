"use client";

import { AppIcon } from "@/components/ui/app-icon";

type ProgressCardProps = {
  level: number;
  titleEs: string;
  currentXP: number;
  nextLevelXP: number;
  streakDays: number;
  isCollapsed?: boolean;
};

export function ProgressCard({
  level,
  titleEs,
  currentXP,
  nextLevelXP,
  streakDays,
  isCollapsed = false,
}: ProgressCardProps) {
  const progress =
    nextLevelXP > 0 ? Math.min((currentXP / nextLevelXP) * 100, 100) : 100;

  // ── Collapsed: icon-only view ───────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
          {level}
        </div>
        <div className="flex items-center gap-0.5">
          <AppIcon className="text-sm text-amber-500" name="local_fire_department" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
            {streakDays}
          </span>
        </div>
      </div>
    );
  }

  // ── Expanded view ───────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        {/* Level badge */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-md shadow-primary/20">
          {level}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {titleEs}
            </p>
            <div className="ml-2 flex shrink-0 items-center gap-1">
              <AppIcon className="text-sm text-amber-500" name="local_fire_department" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {streakDays}d
              </span>
            </div>
          </div>

          {/* XP bar */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          </p>
        </div>
      </div>
    </div>
  );
}
