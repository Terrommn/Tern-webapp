"use client";

import { useState } from "react";
import type {
  AchievementCategory,
  AchievementDefinition,
  AchievementTier,
  UserAchievement,
  UserAchievementProgress,
} from "@/types/gamification";

type AchievementGridProps = {
  achievements: AchievementDefinition[];
  userAchievements: UserAchievement[];
  progress: UserAchievementProgress[];
};

const TIER_COLORS: Record<AchievementTier, string> = {
  acero: "#94a3b8",
  cobre: "#d97706",
  plata: "#9ca3af",
  oro: "#eab308",
  platino: "#a78bfa", // fallback solid for gradient
};

const TIER_BG: Record<AchievementTier, string> = {
  acero: "ring-slate-400",
  cobre: "ring-amber-600",
  plata: "ring-slate-400",
  oro: "ring-yellow-500",
  platino: "ring-violet-400",
};

const CATEGORY_TABS: { key: AchievementCategory | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "order_management", label: "Ordenes" },
  { key: "client_relations", label: "Clientes" },
  { key: "product_knowledge", label: "Productos" },
  { key: "system_mastery", label: "Sistema" },
  { key: "consistency", label: "Constancia" },
];

function BadgeCard({
  achievement,
  unlocked,
  progressValue,
  targetValue,
}: {
  achievement: AchievementDefinition;
  unlocked: boolean;
  progressValue: number | null;
  targetValue: number | null;
}) {
  const isHidden = achievement.is_hidden && !unlocked;
  const tierColor = TIER_COLORS[achievement.tier];
  const tierRing = TIER_BG[achievement.tier];

  return (
    <div
      className={[
        "group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
        unlocked
          ? "border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
          : "border-slate-100 bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900/50",
      ].join(" ")}
    >
      {/* Badge icon */}
      <div
        className={[
          "flex h-12 w-12 items-center justify-center rounded-full ring-2",
          unlocked ? tierRing : "ring-slate-300 dark:ring-slate-700",
          unlocked ? "" : "grayscale",
        ].join(" ")}
        style={
          unlocked && achievement.tier === "platino"
            ? {
                background:
                  "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #c084fc 100%)",
              }
            : undefined
        }
      >
        {isHidden ? (
          <span className="material-symbols-outlined text-lg text-slate-400">
            help
          </span>
        ) : unlocked ? (
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: tierColor }}
          >
            {achievement.icon_name ?? "emoji_events"}
          </span>
        ) : (
          <span className="material-symbols-outlined text-lg text-slate-400 dark:text-slate-600">
            lock
          </span>
        )}
      </div>

      {/* Name */}
      <p
        className={[
          "text-[11px] font-semibold leading-tight",
          unlocked
            ? "text-slate-900 dark:text-white"
            : "text-slate-400 dark:text-slate-600",
        ].join(" ")}
      >
        {isHidden ? "???" : (achievement.name_es ?? achievement.name_en ?? "")}
      </p>

      {/* Tier dot */}
      {!isHidden && (
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tierColor }}
        />
      )}

      {/* Progress bar for locked achievements with tracked progress */}
      {!unlocked && !isHidden && progressValue !== null && targetValue !== null && targetValue > 0 && (
        <div className="w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-slate-400 transition-all duration-500"
              style={{
                width: `${Math.min((progressValue / targetValue) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="mt-0.5 text-[9px] text-slate-400">
            {Math.round(progressValue)}/{Math.round(targetValue)}
          </p>
        </div>
      )}
    </div>
  );
}

export function AchievementGrid({
  achievements,
  userAchievements,
  progress,
}: AchievementGridProps) {
  const [activeTab, setActiveTab] = useState<AchievementCategory | "all">(
    "all",
  );

  const unlockedSet = new Set(userAchievements.map((ua) => ua.achievement_id));
  const progressMap = new Map(
    progress.map((p) => [p.achievement_id, p]),
  );

  const filtered =
    activeTab === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeTab);

  // Sort: unlocked first, then by sort_order
  const sorted = [...filtered].sort((a, b) => {
    const aUnlocked = unlockedSet.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedSet.has(b.id) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return a.sort_order - b.sort_order;
  });

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((achievement) => {
          const unlocked = unlockedSet.has(achievement.id);
          const prog = progressMap.get(achievement.id);
          return (
            <BadgeCard
              key={achievement.id}
              achievement={achievement}
              unlocked={unlocked}
              progressValue={prog?.current_value ?? null}
              targetValue={prog?.target_value ?? null}
            />
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          No hay logros en esta categoria.
        </p>
      )}
    </div>
  );
}
