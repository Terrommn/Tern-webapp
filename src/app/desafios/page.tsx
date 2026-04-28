import { AppIcon } from "@/components/ui/app-icon";
import { AuthShell } from "@/components/steelflow/AuthShell";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Desafios | SteelFlow Pro",
  description: "Desafios diarios, semanales y mensuales para ganar XP.",
};

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const TIER_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  bronze: { bg: "bg-[#cd7f32]/10", text: "text-[#cd7f32]", badge: "#cd7f32" },
  silver: { bg: "bg-[#c0c0c0]/10", text: "text-[#c0c0c0]", badge: "#c0c0c0" },
  gold: { bg: "bg-[#ffd700]/10", text: "text-[#ffd700]", badge: "#ffd700" },
};

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatToday(): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default async function DesafiosPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [dailyRes, weeklyRes, monthlyRes, completedRes] = await Promise.all([
    supabase
      .from("user_challenges")
      .select("*, challenge_definitions(*)")
      .eq("user_id", DEMO_USER_ID)
      .eq("is_completed", false)
      .gte("period_end", today)
      .order("period_end", { ascending: true }),
    supabase
      .from("user_challenges")
      .select("*, challenge_definitions(*)")
      .eq("user_id", DEMO_USER_ID)
      .eq("is_completed", false)
      .gte("period_end", today)
      .order("period_end", { ascending: true }),
    supabase
      .from("user_challenges")
      .select("*, challenge_definitions(*)")
      .eq("user_id", DEMO_USER_ID)
      .eq("is_completed", false)
      .gte("period_end", today)
      .order("period_end", { ascending: true }),
    supabase
      .from("user_challenges")
      .select("*, challenge_definitions(*)")
      .eq("user_id", DEMO_USER_ID)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  // Filter by duration from the joined challenge_definitions
  const allActive = dailyRes.data ?? [];
  const dailyChallenges = allActive.filter(
    (c) => c.challenge_definitions?.duration === "daily"
  );
  const weeklyChallenges = allActive.filter(
    (c) => c.challenge_definitions?.duration === "weekly"
  );
  const monthlyChallenges = allActive.filter(
    (c) => c.challenge_definitions?.duration === "monthly"
  );
  const completedChallenges = completedRes.data ?? [];

  // Stats
  const totalCompleted = completedChallenges.length;
  const totalXPFromChallenges = completedChallenges.reduce(
    (sum, c) => sum + (c.xp_awarded ?? 0),
    0
  );

  function renderChallengeCard(challenge: (typeof allActive)[number]) {
    const def = challenge.challenge_definitions;
    const tier = def?.tier ?? "bronze";
    const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
    const progress = challenge.current_progress ?? 0;
    const threshold = def?.condition_threshold ?? 1;
    const pct = Math.min(100, Math.round((progress / threshold) * 100));

    return (
      <div
        key={challenge.id}
        className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
              <AppIcon className="text-lg text-primary" name="target" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {def?.name ?? "Desafio"}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${tierStyle.badge}20`,
                    color: tierStyle.badge,
                  }}
                >
                  {TIER_LABELS[tier] ?? tier}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {def?.description ?? ""}
              </p>
            </div>
          </div>
          <span className="whitespace-nowrap rounded-xl bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            +{def?.xp_reward ?? 0} XP
          </span>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-slate-400">
            <span>
              {progress} / {threshold}
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
      </div>
    );
  }

  return (
    <AuthShell>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 p-6 lg:p-10">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/5" />
          <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-primary/5" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              DESAFIOS DE ACERO
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Desafios Diarios, Semanales y Mensuales
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Completa desafios para ganar XP adicional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main content */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Daily Challenges */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-primary" name="local_fire_department" />
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Desafios del Dia
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {formatToday()}
              </p>

              {dailyChallenges.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dailyChallenges.map(renderChallengeCard)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <AppIcon className="text-3xl" name="local_fire_department" />
                  <p className="text-sm">
                    Los desafios diarios se asignan automaticamente. Vuelve manana.
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Challenges */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-primary" name="target" />
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Desafios de la Semana
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Renuevo semanal
              </p>

              {weeklyChallenges.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {weeklyChallenges.map(renderChallengeCard)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <AppIcon className="text-3xl" name="target" />
                  <p className="text-sm">
                    No hay desafios semanales activos esta semana.
                  </p>
                </div>
              )}
            </div>

            {/* Monthly Challenges */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-primary" name="crown" />
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Desafio del Mes
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Renuevo mensual
              </p>

              {monthlyChallenges.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {monthlyChallenges.map(renderChallengeCard)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <AppIcon className="text-3xl" name="crown" />
                  <p className="text-sm">
                    No hay desafios mensuales activos este mes.
                  </p>
                </div>
              )}
            </div>

            {/* Completed Challenges */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-emerald-500" name="check_circle" />
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Desafios Completados
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Tu historial de victorias
              </p>

              {completedChallenges.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {completedChallenges.map((c) => {
                    const def = c.challenge_definitions;
                    const tier = def?.tier ?? "bronze";
                    const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.bronze;

                    return (
                      <div
                        key={c.id}
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
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {def?.name ?? "Desafio"}
                              </p>
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                                style={{
                                  backgroundColor: `${tierStyle.badge}20`,
                                  color: tierStyle.badge,
                                }}
                              >
                                {TIER_LABELS[tier] ?? tier}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {formatDate(c.completed_at)}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                          +{c.xp_awarded ?? 0} XP
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <AppIcon className="text-3xl" name="check_circle" />
                  <p className="text-sm">
                    Aun no has completado ningun desafio
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Challenge Stats */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-primary" name="trending_up" />
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Estadisticas
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Resumen de desafios
              </p>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Desafios Completados
                  </p>
                  <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                    {totalCompleted}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    XP de Desafios
                  </p>
                  <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                    {totalXPFromChallenges.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Desafios Activos
                  </p>
                  <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                    {allActive.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Tier legend */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon className="text-xl text-primary" name="shield" />
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Niveles de Desafio
                </h2>
              </div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Dificultad y recompensa
              </p>

              <div className="flex flex-col gap-3">
                {(["bronze", "silver", "gold"] as const).map((tier) => {
                  const style = TIER_COLORS[tier];
                  return (
                    <div key={tier} className="flex items-center gap-3">
                      <div
                        className="size-4 rounded-full"
                        style={{ backgroundColor: style.badge }}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {TIER_LABELS[tier]}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {tier === "bronze"
                            ? "Desafios basicos"
                            : tier === "silver"
                              ? "Desafios intermedios"
                              : "Desafios avanzados"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </AuthShell>
  );
}
