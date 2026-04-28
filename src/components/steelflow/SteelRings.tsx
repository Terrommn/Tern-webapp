"use client";

type SteelRingsProps = {
  flowCount: number;
  flowTarget: number;
  tonnageValue: number;
  tonnageTarget: number;
  reachCount: number;
  reachTarget: number;
  streakDays: number;
};

function clamp01(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(value / target, 1);
}

function Ring({
  radius,
  progress,
  color,
  strokeWidth,
}: {
  radius: number;
  progress: number;
  color: string;
  strokeWidth: number;
}) {
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-slate-200 dark:text-slate-800"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </>
  );
}

export function SteelRings({
  flowCount,
  flowTarget,
  tonnageValue,
  tonnageTarget,
  reachCount,
  reachTarget,
  streakDays,
}: SteelRingsProps) {
  const flowProgress = clamp01(flowCount, flowTarget);
  const tonnageProgress = clamp01(tonnageValue, tonnageTarget);
  const reachProgress = clamp01(reachCount, reachTarget);

  const ringsClosed =
    (flowProgress >= 1 ? 1 : 0) +
    (tonnageProgress >= 1 ? 1 : 0) +
    (reachProgress >= 1 ? 1 : 0);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG Rings */}
      <div className="relative mx-auto w-full max-w-[200px]">
        <svg viewBox="0 0 120 120" className="w-full">
          {/* Outer: Flow (red) */}
          <Ring
            radius={52}
            progress={flowProgress}
            color="#d41111"
            strokeWidth={7}
          />
          {/* Middle: Tonnage (amber) */}
          <Ring
            radius={41}
            progress={tonnageProgress}
            color="#f59e0b"
            strokeWidth={7}
          />
          {/* Inner: Reach (emerald) */}
          <Ring
            radius={30}
            progress={reachProgress}
            color="#10b981"
            strokeWidth={7}
          />
        </svg>

        {/* Center labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {ringsClosed}/3
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex w-full flex-col gap-1 px-1">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#d41111" }}
            />
            <span className="text-slate-500 dark:text-slate-400">Flow</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {flowCount}/{flowTarget}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#f59e0b" }}
            />
            <span className="text-slate-500 dark:text-slate-400">
              Tonelaje
            </span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {Math.round(tonnageValue)}/{tonnageTarget}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#10b981" }}
            />
            <span className="text-slate-500 dark:text-slate-400">Alcance</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {reachCount}/{reachTarget}
          </span>
        </div>
      </div>

      {/* Rings closed label */}
      <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {ringsClosed} de 3 anillos cerrados hoy
      </p>

      {/* Streak indicator */}
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
        <span className="material-symbols-outlined text-base text-amber-500">
          local_fire_department
        </span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
          {streakDays} {streakDays === 1 ? "dia" : "dias"}
        </span>
      </div>
    </div>
  );
}
