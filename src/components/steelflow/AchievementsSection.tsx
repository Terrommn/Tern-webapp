"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useState } from "react";

type AchievementDef = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
  category: string;
  tier: string;
  xp_value: number;
  icon_name: string;
  is_hidden: boolean;
  sort_order: number;
};

type UserAchievement = {
  id: string;
  achievement_id: string;
  unlocked_at: string;
};

const TIER_COLORS: Record<string, string> = {
  acero: "#94a3b8",
  cobre: "#d97706",
  plata: "#9ca3af",
  oro: "#eab308",
  platino: "#e2e8f0",
};

const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "order_management", label: "Ordenes" },
  { key: "client_relations", label: "Clientes" },
  { key: "product_knowledge", label: "Productos" },
  { key: "system_mastery", label: "Sistema" },
  { key: "consistency", label: "Consistencia" },
];

export function AchievementsSection({
  definitions,
  unlocked,
}: {
  definitions: AchievementDef[];
  unlocked: UserAchievement[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));
  const totalUnlocked = unlockedIds.size;
  const totalAchievements = definitions.length || 55;

  const filtered =
    activeCategory === "all"
      ? definitions
      : definitions.filter((d) => d.category === activeCategory);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-1 flex items-center gap-2">
        <AppIcon className="text-xl text-primary" name="emoji_events" />
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Logros
        </h2>
      </div>
      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
        {totalUnlocked} de {totalAchievements} desbloqueados
      </p>

      {/* Category filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={[
              "rounded-2xl px-4 py-2 text-xs font-semibold transition-colors",
              activeCategory === cat.key
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
            ].join(" ")}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const isHidden = achievement.is_hidden && !isUnlocked;
            const tierColor = TIER_COLORS[achievement.tier] ?? "#94a3b8";

            return (
              <div
                key={achievement.id}
                className={[
                  "group flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all",
                  isUnlocked
                    ? "bg-slate-50 dark:bg-slate-900"
                    : "bg-slate-50/50 opacity-50 dark:bg-slate-900/50",
                ].join(" ")}
                style={
                  isUnlocked
                    ? { borderLeft: `3px solid ${tierColor}` }
                    : undefined
                }
              >
                <div
                  className={[
                    "relative flex size-12 items-center justify-center rounded-xl",
                    isUnlocked
                      ? "bg-white shadow-sm dark:bg-slate-800"
                      : "bg-slate-200 dark:bg-slate-800",
                  ].join(" ")}
                >
                  {isHidden ? (
                    <span className="text-lg font-black text-slate-400">?</span>
                  ) : (
                    <AppIcon
                      className={[
                        "text-lg",
                        isUnlocked ? "text-slate-900 dark:text-white" : "text-slate-400",
                      ].join(" ")}
                      name={achievement.icon_name || "star"}
                    />
                  )}
                  {!isUnlocked && !isHidden && (
                    <div className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700">
                      <AppIcon className="text-[10px] text-slate-500" name="lock" />
                    </div>
                  )}
                </div>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700 dark:text-slate-300">
                  {isHidden ? "???" : achievement.name_es}
                </span>
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tierColor }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
          <AppIcon className="text-3xl" name="emoji_events" />
          <p className="text-sm">No hay logros en esta categoria.</p>
        </div>
      )}
    </div>
  );
}
