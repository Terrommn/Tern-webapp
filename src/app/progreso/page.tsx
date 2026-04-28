import { AppIcon } from "@/components/ui/app-icon";
import { AchievementsSection } from "@/components/steelflow/AchievementsSection";
import { AuthShell } from "@/components/steelflow/AuthShell";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mi Progreso | SteelFlow Pro",
  description: "Panel de progreso, logros y estadisticas del operador.",
};

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 200 },
  { level: 3, xp: 500 },
  { level: 4, xp: 1000 },
  { level: 5, xp: 2000 },
  { level: 6, xp: 3500 },
  { level: 7, xp: 5500 },
  { level: 8, xp: 8000 },
  { level: 9, xp: 12000 },
  { level: 10, xp: 17000 },
  { level: 11, xp: 24000 },
  { level: 12, xp: 33000 },
];

const PATH_NAMES: Record<string, string> = {
  order_flow: "Flujo de Ordenes",
  client_relations: "Relaciones con Clientes",
  product_specialist: "Especialista de Producto",
};

const PATH_ICONS: Record<string, string> = {
  order_flow: "receipt_long",
  client_relations: "groups",
  product_specialist: "inventory_2",
};

function getNextLevelXP(currentLevel: number): number {
  const next = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return next?.xp ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
}

function getCurrentLevelXP(currentLevel: number): number {
  const current = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel);
  return current?.xp ?? 0;
}

export default async function ProgresoPage() {
  const supabase = await createClient();

  const [
    profileRes,
    levelDefsRes,
    achievementDefsRes,
    userAchievementsRes,
    masteryRes,
    xpEventsRes,
    personalRecordsRes,
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", DEMO_USER_ID)
      .maybeSingle(),
    supabase
      .from("level_definitions")
      .select("*")
      .order("level", { ascending: true }),
    supabase
      .from("achievement_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", DEMO_USER_ID),
    supabase
      .from("mastery_paths")
      .select("*")
      .eq("user_id", DEMO_USER_ID),
    supabase
      .from("xp_events")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("user_personal_records")
      .select("*")
      .eq("user_id", DEMO_USER_ID),
  ]);

  const profile = profileRes.data;
  const levelDefs = levelDefsRes.data ?? [];
  const achievementDefs = achievementDefsRes.data ?? [];
  const userAchievements = userAchievementsRes.data ?? [];
  const masteryPaths = masteryRes.data ?? [];
  const xpEvents = xpEventsRes.data ?? [];
  const personalRecords = personalRecordsRes.data ?? [];

  // Derived data
  const totalXP = profile?.total_xp ?? 0;
  const currentLevel = profile?.current_level ?? 1;
  const currentStreak = profile?.current_streak_days ?? 0;
  const totalUnlocked = userAchievements.length;

  const currentLevelDef = levelDefs.find((l) => l.level === currentLevel);
  const levelTitle = currentLevelDef?.title_es ?? "Aprendiz";

  const currentLevelXP = getCurrentLevelXP(currentLevel);
  const nextLevelXP = getNextLevelXP(currentLevel);
  const xpInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPct = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  // Group XP events by date for the chart (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const xpByDate = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    xpByDate.set(d.toISOString().slice(0, 10), 0);
  }
  for (const evt of xpEvents) {
    if (evt.created_at) {
      const dateKey = new Date(evt.created_at).toISOString().slice(0, 10);
      if (xpByDate.has(dateKey)) {
        xpByDate.set(dateKey, (xpByDate.get(dateKey) ?? 0) + (evt.xp_amount ?? 0));
      }
    }
  }

  const xpChartData = [...xpByDate.entries()].map(([date, xp]) => ({ date, xp }));
  const maxDailyXP = Math.max(...xpChartData.map((d) => d.xp), 1);
  const hasXPData = xpChartData.some((d) => d.xp > 0);

  // Recent activity (last 15 events)
  const recentEvents = xpEvents.slice(0, 15);

  return (
    <AuthShell>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 p-6 lg:p-10">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/5" />
          <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-primary/5" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              MI PROGRESO
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Tu Perfil de Operador
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Nivel {currentLevel} — {levelTitle} — {totalXP.toLocaleString()} XP total
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Level */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <AppIcon className="text-lg text-primary" name="shield" />
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Nivel
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
              {currentLevel}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {levelTitle}
            </p>
          </div>

          {/* Total XP */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <AppIcon className="text-lg text-primary" name="zap" />
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              XP Total
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
              {totalXP.toLocaleString()}
            </p>
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                <span>{xpInLevel} / {xpNeeded} XP</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10">
                <AppIcon className="text-lg text-orange-500" name="local_fire_department" />
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Racha Actual
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
              {currentStreak}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {currentStreak === 1 ? "dia" : "dias"} consecutivos
            </p>
          </div>

          {/* Achievements */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-yellow-500/10">
                <AppIcon className="text-lg text-yellow-500" name="emoji_events" />
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Logros
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
              {totalUnlocked}
              <span className="text-lg font-semibold text-slate-400">
                /{achievementDefs.length || 55}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">desbloqueados</p>
          </div>
        </div>

        {/* XP History */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="trending_up" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Historial de XP
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Ultimos 30 Dias
          </p>

          {hasXPData ? (
            <div className="flex h-40 items-end gap-[2px]">
              {xpChartData.map((bar) => (
                <div
                  key={bar.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  title={`${bar.date}: ${bar.xp} XP`}
                >
                  <div
                    className="w-full min-h-[2px] rounded-t bg-primary/30 transition-colors group-hover:bg-primary"
                    style={{
                      height: `${Math.max(2, Math.round((bar.xp / maxDailyXP) * 100))}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <AppIcon className="text-3xl" name="trending_up" />
              <p className="text-sm">
                Comienza a usar SteelFlow para ver tu historial
              </p>
            </div>
          )}
        </div>

        {/* Mastery Paths */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="route" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Caminos de Maestria
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Especializacion profesional
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(["order_flow", "client_relations", "product_specialist"] as const).map(
              (pathKey) => {
                const path = masteryPaths.find((p) => p.path_key === pathKey);
                const currentTier = path?.current_tier ?? 0;
                const domainXP = path?.domain_xp ?? 0;

                return (
                  <div
                    key={pathKey}
                    className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                        <AppIcon
                          className="text-lg text-primary"
                          name={PATH_ICONS[pathKey]}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {PATH_NAMES[pathKey]}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Tier {currentTier}/5 — {domainXP} XP
                        </p>
                      </div>
                    </div>

                    {/* Vertical progress nodes */}
                    <div className="flex flex-col items-center gap-1 py-2">
                      {[5, 4, 3, 2, 1].map((tier) => (
                        <div key={tier} className="flex items-center gap-3">
                          <span className="w-4 text-right text-[10px] font-bold text-slate-400">
                            {tier}
                          </span>
                          <div
                            className={[
                              "size-5 rounded-full border-2 transition-all",
                              tier <= currentTier
                                ? "border-primary bg-primary"
                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                            ].join(" ")}
                          >
                            {tier <= currentTier && (
                              <div className="flex size-full items-center justify-center">
                                <AppIcon className="text-[10px] text-white" name="check" />
                              </div>
                            )}
                          </div>
                          {tier > 1 && (
                            <div className="h-3 w-[2px] bg-slate-200 dark:bg-slate-700" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Achievements Grid (client component) */}
        <AchievementsSection
          definitions={achievementDefs}
          unlocked={userAchievements}
        />

        {/* Personal Records */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="medal" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Records Personales
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Tus mejores marcas
          </p>

          {personalRecords.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {personalRecords.map((record) => (
                <div
                  key={`${record.user_id}-${record.record_type}`}
                  className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {record.record_type?.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {record.record_value}
                  </p>
                  {record.record_date && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Intl.DateTimeFormat("es-MX", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(record.record_date))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <AppIcon className="text-3xl" name="medal" />
              <p className="text-sm">
                Aun no tienes records. Sigue usando SteelFlow!
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1 flex items-center gap-2">
            <AppIcon className="text-xl text-primary" name="clock" />
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Actividad Reciente
            </h2>
          </div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Ultimos eventos de XP
          </p>

          {recentEvents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentEvents.map((evt, i) => (
                <div
                  key={`${evt.created_at}-${i}`}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <AppIcon className="text-sm text-primary" name="zap" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {evt.description ?? evt.action_type}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {evt.created_at
                          ? new Intl.DateTimeFormat("es-MX", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(evt.created_at))
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                    +{evt.xp_amount} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <AppIcon className="text-3xl" name="clock" />
              <p className="text-sm">
                No hay actividad reciente. Comienza a usar SteelFlow para ganar XP.
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthShell>
  );
}
