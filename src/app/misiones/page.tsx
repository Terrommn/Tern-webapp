import { AppIcon } from "@/components/ui/app-icon";
import { AuthShell } from "@/components/steelflow/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_THRESHOLDS } from "@/lib/gamification";

export const metadata = {
  title: "Misiones | SteelFlow Pro",
  description: "Diario de misiones y narrativa del operador.",
};

const RANK_NARRATIVES = [
  {
    rank: 1,
    title: "Forge Apprentice",
    text: "Tu primer dia. El horno zumba. Es hora de aprender.",
  },
  {
    rank: 2,
    title: "Steel Initiate",
    text: "Puedes sentir el calor. El capataz asiente con aprobacion.",
  },
  {
    rank: 3,
    title: "Melt Technician",
    text: "El acero fundido responde a tus comandos. Entiendes el flujo.",
  },
  {
    rank: 4,
    title: "Caster Operator",
    text: "Las lineas de colada estan bajo tu control. La precision te define.",
  },
  {
    rank: 5,
    title: "Rolling Specialist",
    text: "El laminado no tiene secretos para ti. Cada pasada es perfecta.",
  },
  {
    rank: 6,
    title: "Heat Master",
    text: "Dominas la temperatura. El metal obedece tu voluntad.",
  },
  {
    rank: 7,
    title: "Alloy Engineer",
    text: "Comprendes las aleaciones. Tu conocimiento forja acero superior.",
  },
  {
    rank: 8,
    title: "Forge Commander",
    text: "Lideras la fragua. Tu equipo sigue tu ejemplo sin dudar.",
  },
  {
    rank: 9,
    title: "Steel Strategist",
    text: "Ves el panorama completo. Cada orden es parte de tu plan maestro.",
  },
  {
    rank: 10,
    title: "Plant Director",
    text: "La planta entera opera bajo tu vision. Eres referencia para todos.",
  },
  {
    rank: 11,
    title: "Industry Legend",
    text: "Tu nombre es sinonimo de excelencia. La industria te reconoce.",
  },
  {
    rank: 12,
    title: "Steel Titan",
    text: "Has alcanzado la cima. Eres la leyenda viviente del acero.",
  },
];

const QUEST_TYPE_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  seasonal: "Estacional",
};

const QUEST_TYPE_ORDER = ["weekly", "monthly", "seasonal"];

function getNextLevelXP(currentLevel: number): number {
  const nextIdx = currentLevel + 1;
  if (nextIdx >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  }
  return LEVEL_THRESHOLDS[nextIdx];
}

function getCurrentLevelXP(currentLevel: number): number {
  if (currentLevel < 0 || currentLevel >= LEVEL_THRESHOLDS.length) return 0;
  return LEVEL_THRESHOLDS[currentLevel];
}

export default async function MisionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [profileRes, levelDefsRes, activeQuestsRes, onboardingQuestsRes, completedQuestsRes] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("level_definitions")
        .select("*")
        .order("level", { ascending: true }),
      supabase
        .from("user_quests")
        .select("*, quest_definitions(*)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("user_quests")
        .select("*, quest_definitions(*)")
        .eq("user_id", userId)
        .like("quest_id", "onb_%")
        .order("quest_id", { ascending: true }),
      supabase
        .from("user_quests")
        .select("*, quest_definitions(*)")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

  const profile = profileRes.data;
  const levelDefs = levelDefsRes.data ?? [];
  const activeQuests = activeQuestsRes.data ?? [];
  const onboardingQuests = onboardingQuestsRes.data ?? [];
  const completedQuests = completedQuestsRes.data ?? [];

  const totalXP = profile?.total_xp ?? 0;
  const currentLevel = profile?.current_level ?? 1;

  const currentLevelDef = levelDefs.find((l) => l.level === currentLevel);
  const levelTitle = currentLevelDef?.title_es ?? "Aprendiz";

  const currentLevelXP = getCurrentLevelXP(currentLevel);
  const nextLevelXP = getNextLevelXP(currentLevel);
  const xpInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPct =
    xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  const currentNarrative = RANK_NARRATIVES.find((n) => n.rank === currentLevel);

  // Group active quests by type
  const questsByType: Record<string, typeof activeQuests> = {};
  for (const q of activeQuests) {
    const questDef = q.quest_definitions;
    const qType = questDef?.quest_type ?? "weekly";
    if (!questsByType[qType]) questsByType[qType] = [];
    questsByType[qType].push(q);
  }

  // Onboarding progress
  const onboardingCompleted = onboardingQuests.filter(
    (q) => q.status === "completed"
  ).length;
  const onboardingTotal = onboardingQuests.length;
  const hasOnboarding = onboardingTotal > 0;
  const onboardingDone = hasOnboarding && onboardingCompleted === onboardingTotal;

  return (
    <AuthShell>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 p-6 lg:p-10">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/5" />
          <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-primary/5" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              THE STEEL CHRONICLES
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Rank {currentLevel}: {levelTitle}
            </h1>
            {currentNarrative && (
              <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">
                &ldquo;{currentNarrative.text}&rdquo;
              </p>
            )}

            {/* XP Progress bar to next rank */}
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-400">
                <span>
                  {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </span>
                <span>Rank {currentLevel + 1 <= 12 ? currentLevel + 1 : "MAX"}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Quests */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="swords" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Misiones Activas
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Completa misiones para ganar XP
          </p>

          {activeQuests.length > 0 ? (
            <div className="flex flex-col gap-6">
              {QUEST_TYPE_ORDER.map((qType) => {
                const quests = questsByType[qType];
                if (!quests || quests.length === 0) return null;

                return (
                  <div key={qType}>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-primary">
                      {QUEST_TYPE_LABELS[qType] ?? qType}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {quests.map((q) => {
                        const questDef = q.quest_definitions;
                        const progress = q.current_progress ?? 0;
                        const target = q.target_count ?? questDef?.target_count ?? 1;
                        const pct = Math.min(
                          100,
                          Math.round((progress / target) * 100)
                        );

                        return (
                          <div
                            key={q.id}
                            className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                                <AppIcon
                                  className="text-lg text-primary"
                                  name={questDef?.icon ?? "scroll"}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {questDef?.title ?? "Mision"}
                                  </p>
                                  <span className="rounded-xl bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                                    +{questDef?.xp_reward ?? 0} XP
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                                  {questDef?.description ?? ""}
                                </p>
                                <div className="mt-2">
                                  <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                                    <span>
                                      {progress} / {target}
                                    </span>
                                    <span>{pct}%</span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                {q.expires_at && (
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                    <AppIcon className="text-[10px]" name="timer" />
                                    Expira:{" "}
                                    {new Intl.DateTimeFormat("es-MX", {
                                      month: "short",
                                      day: "numeric",
                                    }).format(new Date(q.expires_at))}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <AppIcon className="text-3xl" name="swords" />
              <p className="text-sm">
                No tienes misiones activas. Se asignan nuevas cada lunes.
              </p>
            </div>
          )}
        </div>

        {/* Onboarding Progress (only if not all completed) */}
        {hasOnboarding && !onboardingDone && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-1 flex items-center gap-2">
              <AppIcon className="text-xl text-primary" name="route" />
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Forjando Tu Camino
              </h2>
            </div>
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Onboarding — {onboardingCompleted}/{onboardingTotal} completadas
            </p>

            <div className="flex flex-col gap-1">
              {onboardingQuests.map((q, idx) => {
                const questDef = q.quest_definitions;
                const isCompleted = q.status === "completed";
                const isActive = q.status === "active";

                return (
                  <div
                    key={q.id}
                    className={[
                      "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
                      isActive
                        ? "bg-primary/5 ring-1 ring-primary/20"
                        : isCompleted
                          ? "bg-slate-50 dark:bg-slate-900"
                          : "opacity-40",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-primary text-white"
                            : "bg-slate-200 text-slate-400 dark:bg-slate-700",
                      ].join(" ")}
                    >
                      {isCompleted ? (
                        <AppIcon className="text-sm" name="check" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={[
                          "text-sm font-semibold",
                          isCompleted
                            ? "text-slate-500 line-through"
                            : isActive
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-400",
                        ].join(" ")}
                      >
                        {questDef?.title ?? `Paso ${idx + 1}`}
                      </p>
                    </div>
                    {isCompleted && (
                      <AppIcon className="text-sm text-emerald-500" name="check_circle" />
                    )}
                    {isActive && (
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        En Progreso
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Quests */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-emerald-500" name="check_circle" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Misiones Completadas
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Tu historial de logros
          </p>

          {completedQuests.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {completedQuests.map((q) => {
                const questDef = q.quest_definitions;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                        <AppIcon
                          className="text-sm text-emerald-500"
                          name="check_circle"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {questDef?.title ?? "Mision"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {q.completed_at
                            ? new Intl.DateTimeFormat("es-MX", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }).format(new Date(q.completed_at))
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                      +{q.xp_awarded ?? questDef?.xp_reward ?? 0} XP
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <AppIcon className="text-3xl" name="check_circle" />
              <p className="text-sm">Completa misiones para verlas aqui</p>
            </div>
          )}
        </div>

        {/* The Story So Far */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="menu_book" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              La Historia Hasta Ahora
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Tu camino en The Steel Chronicles
          </p>

          <div className="flex flex-col gap-3">
            {RANK_NARRATIVES.filter((n) => n.rank <= currentLevel)
              .reverse()
              .map((narrative) => (
                <div
                  key={narrative.rank}
                  className={[
                    "rounded-2xl p-4 transition-all",
                    narrative.rank === currentLevel
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "bg-slate-50 dark:bg-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "flex size-9 items-center justify-center rounded-xl text-sm font-black",
                        narrative.rank === currentLevel
                          ? "bg-primary text-white"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
                      ].join(" ")}
                    >
                      {narrative.rank}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {narrative.title}
                      </p>
                      <p className="text-[12px] italic text-slate-500 dark:text-slate-400">
                        &ldquo;{narrative.text}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </AuthShell>
  );
}
