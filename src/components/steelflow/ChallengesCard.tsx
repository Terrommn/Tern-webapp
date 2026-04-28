"use client";

import { AppIcon } from "@/components/ui/app-icon";
import type { ChallengeDefinition, UserChallenge } from "@/types/gamification";

type ChallengesCardProps = {
  challenges: (UserChallenge & { definition: ChallengeDefinition })[];
};

const TIER_ACCENT: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#9ca3af",
  gold: "#eab308",
};

export function ChallengesCard({ challenges }: ChallengesCardProps) {
  // Show top 3 active (not completed) challenges
  const active = challenges
    .filter((c) => !c.is_completed)
    .slice(0, 3);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <AppIcon className="text-lg text-primary" name="target" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Desafios del Dia
        </h3>
      </div>

      {active.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-slate-400">
          No hay desafios activos
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((challenge) => {
            const progress = Math.min(
              challenge.current_progress / (challenge.definition.condition_threshold || 1),
              1,
            );
            const accent =
              TIER_ACCENT[challenge.definition.tier] ?? TIER_ACCENT.bronze;

            return (
              <div key={challenge.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {challenge.definition.name ?? "Desafio"}
                  </p>
                  <span className="ml-2 shrink-0 text-[11px] font-bold text-slate-500">
                    {challenge.current_progress}/
                    {challenge.definition.condition_threshold}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: accent }}
                  >
                    {challenge.definition.tier}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    +{challenge.definition.xp_reward} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
