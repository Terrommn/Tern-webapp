import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AchievementDefinition,
  DailyActivity,
  UserProfile,
} from "@/types/gamification";

// ── XP reward values ────────────────────────────────────────────────────

export const XP_VALUES: Record<string, number> = {
  order_created: 25,
  order_assembled: 50,
  order_cumplida: 75,
  order_completed: 40,
  status_updated: 15,
  client_created: 30,
  product_created: 30,
  product_updated: 20,
  daily_login: 10,
  search_used: 3,
  view_detail: 5,
  simulator_used: 20,
  calculator_used: 15,
  gesture_mode_first_use: 30,
};

// ── Level thresholds ────────────────────────────────────────────────────
// Each entry is the cumulative XP required to reach that level.
// Index 0 = level 0 (starting), index 1 = level 1, etc.

export const LEVEL_THRESHOLDS: number[] = [
  0, // Level 0
  0, // Level 1 (start)
  100, // Level 2
  250, // Level 3
  500, // Level 4
  850, // Level 5
  1300, // Level 6
  1900, // Level 7
  2650, // Level 8
  3600, // Level 9
  4800, // Level 10
  6300, // Level 11
  8100, // Level 12
  10200, // Level 13
  12700, // Level 14
  15600, // Level 15
  19000, // Level 16
  23000, // Level 17
  27600, // Level 18
  32900, // Level 19
  39000, // Level 20
  46000, // Level 21
  54000, // Level 22
  63000, // Level 23
  73000, // Level 24
  85000, // Level 25
];

/**
 * Pure function: returns the level number for a given cumulative XP value.
 */
export function getLevelForXP(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 1; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

/**
 * Returns the XP required for the next level, given current total XP.
 */
export function getXPForNextLevel(xp: number): number {
  const currentLevel = getLevelForXP(xp);
  const nextIdx = currentLevel + 1;
  if (nextIdx >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  }
  return LEVEL_THRESHOLDS[nextIdx];
}

// ── Core gamification functions ─────────────────────────────────────────

/**
 * Award XP to a user.
 * Inserts an xp_events row, increments user_profiles.total_xp, and
 * checks for level-up (updates current_level if changed).
 */
export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  xpAmount: number,
  entityType?: string,
  entityId?: string,
  source?: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<{ newTotalXP: number; newLevel: number; leveledUp: boolean }> {
  // Dedup: skip if identical event exists within the last 5 seconds
  if (entityId) {
    const cutoff = new Date(Date.now() - 5000).toISOString();
    const { data: recent } = await supabase
      .from("xp_events")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", actionType)
      .eq("entity_id", entityId)
      .gte("created_at", cutoff)
      .limit(1);
    if (recent && recent.length > 0) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("total_xp, current_level")
        .eq("id", userId)
        .single();
      return {
        newTotalXP: (profile?.total_xp ?? 0) as number,
        newLevel: (profile?.current_level ?? 1) as number,
        leveledUp: false,
      };
    }
  }

  // 1. Insert XP event
  const { error: insertError } = await supabase.from("xp_events").insert({
    user_id: userId,
    action_type: actionType,
    xp_amount: xpAmount,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    source: source ?? "app",
    description: description ?? null,
  });

  if (insertError) {
    throw new Error(`[gamification] Failed to insert xp_event: ${insertError.message}`);
  }

  // 2. Fetch current profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("total_xp, current_level, total_orders_created, total_clients_created, total_products_created, total_tonnage_processed")
    .eq("id", userId)
    .single();

  const currentXP = (profile?.total_xp ?? 0) as number;
  const oldLevel = (profile?.current_level ?? 1) as number;
  const newTotalXP = currentXP + xpAmount;
  const newLevel = getLevelForXP(newTotalXP);
  const leveledUp = newLevel > oldLevel;

  // 3. Update profile (XP + level + aggregate counters)
  const updates: Record<string, unknown> = {
    total_xp: newTotalXP,
    updated_at: new Date().toISOString(),
  };
  if (leveledUp) {
    updates.current_level = newLevel;
  }
  if (actionType === "order_created") {
    updates.total_orders_created = ((profile?.total_orders_created ?? 0) as number) + 1;
  }
  if (actionType === "client_created") {
    updates.total_clients_created = ((profile?.total_clients_created ?? 0) as number) + 1;
  }
  if (actionType === "product_created") {
    updates.total_products_created = ((profile?.total_products_created ?? 0) as number) + 1;
  }
  if (metadata?.tonnage) {
    updates.total_tonnage_processed =
      ((profile?.total_tonnage_processed ?? 0) as number) + Number(metadata.tonnage);
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId);

  if (updateError) {
    console.error("[gamification] Failed to update profile:", updateError.message);
  }

  return { newTotalXP, newLevel, leveledUp };
}

/**
 * Track a user activity (inserts a row in user_activity_log).
 */
export async function trackActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("user_activity_log").insert({
    user_id: userId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}

/**
 * Get or create today's daily_activity row for a user.
 */
export async function getOrCreateDailyActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyActivity | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Try to fetch existing row
  const { data: existing } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .single();

  if (existing) return existing as DailyActivity;

  // Fetch user targets from profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("ring_flow_target, ring_tonnage_target, ring_reach_target")
    .eq("id", userId)
    .single();

  const flowTarget = (profile?.ring_flow_target ?? 5) as number;
  const tonnageTarget = (profile?.ring_tonnage_target ?? 50) as number;
  const reachTarget = (profile?.ring_reach_target ?? 3) as number;

  const { data: created } = await supabase
    .from("daily_activity")
    .insert({
      user_id: userId,
      activity_date: today,
      ring_flow_target: flowTarget,
      ring_tonnage_target: tonnageTarget,
      ring_reach_target: reachTarget,
      first_activity_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  return (created as DailyActivity) ?? null;
}

/**
 * Increment daily_activity counters (orders_created, orders_completed, xp_earned).
 * Called after every XP award so the heatmap and activity history stay current.
 */
export async function updateDailyActivityCounters(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  xpAmount: number,
): Promise<void> {
  const activity = await getOrCreateDailyActivity(supabase, userId);
  if (!activity) return;

  const updates: Record<string, unknown> = {
    xp_earned: ((activity.xp_earned ?? 0) as number) + xpAmount,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (actionType === "order_created") {
    updates.orders_created = ((activity.orders_created ?? 0) as number) + 1;
  }
  if (actionType === "order_cumplida" || actionType === "order_completed") {
    updates.orders_completed = ((activity.orders_completed ?? 0) as number) + 1;
  }

  await supabase.from("daily_activity").update(updates).eq("id", activity.id);
}

/**
 * Update ring progress in daily_activity.
 * ringType: "flow" | "tonnage" | "reach"
 */
export async function updateRingProgress(
  supabase: SupabaseClient,
  userId: string,
  ringType: "flow" | "tonnage" | "reach",
  incrementValue: number,
): Promise<DailyActivity | null> {
  const activity = await getOrCreateDailyActivity(supabase, userId);
  if (!activity) return null;

  const columnMap = {
    flow: "ring_flow_count",
    tonnage: "ring_tonnage_value",
    reach: "ring_reach_count",
  } as const;

  const targetMap = {
    flow: "ring_flow_target",
    tonnage: "ring_tonnage_target",
    reach: "ring_reach_target",
  } as const;

  const col = columnMap[ringType];
  const currentValue = (activity[col] as number) ?? 0;
  const newValue = currentValue + incrementValue;

  // Calculate how many rings are now closed
  const flowClosed =
    ringType === "flow"
      ? newValue >= activity.ring_flow_target
      : activity.ring_flow_count >= activity.ring_flow_target;
  const tonnageClosed =
    ringType === "tonnage"
      ? newValue >= activity.ring_tonnage_target
      : activity.ring_tonnage_value >= activity.ring_tonnage_target;
  const reachClosed =
    ringType === "reach"
      ? newValue >= activity.ring_reach_target
      : activity.ring_reach_count >= activity.ring_reach_target;

  const ringsClosed =
    (flowClosed ? 1 : 0) + (tonnageClosed ? 1 : 0) + (reachClosed ? 1 : 0);
  const isTripleClose = ringsClosed === 3;

  const heatmapScore = ringsClosed * 25 + (isTripleClose ? 25 : 0);
  const heatmapLevel = isTripleClose
    ? 4
    : ringsClosed >= 2
      ? 3
      : ringsClosed >= 1
        ? 2
        : newValue > 0
          ? 1
          : 0;

  const updates: Record<string, unknown> = {
    [col]: newValue,
    rings_closed: ringsClosed,
    is_triple_close: isTripleClose,
    heatmap_score: heatmapScore,
    heatmap_level: heatmapLevel,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updated } = await supabase
    .from("daily_activity")
    .update(updates)
    .eq("id", activity.id)
    .select("*")
    .single();

  return (updated as DailyActivity) ?? null;
}

/**
 * Check and update the user's login streak.
 * Call this once per session / on mount.
 */
export async function checkAndUpdateStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ streakDays: number; streakBroken: boolean }> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "last_active_date, current_streak_days, longest_streak_days, streak_shields",
    )
    .eq("id", userId)
    .single();

  if (!profile) return { streakDays: 0, streakBroken: false };

  const today = new Date().toISOString().slice(0, 10);
  const lastActive = profile.last_active_date as string | null;
  let streakDays = (profile.current_streak_days ?? 0) as number;
  let longestStreak = (profile.longest_streak_days ?? 0) as number;
  let streakShields = (profile.streak_shields ?? 0) as number;
  let streakBroken = false;

  if (lastActive === today) {
    // Already active today, nothing to do
    return { streakDays, streakBroken: false };
  }

  if (lastActive) {
    const lastDate = new Date(lastActive + "T00:00:00");
    const todayDate = new Date(today + "T00:00:00");
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      // Consecutive day, increment streak
      streakDays += 1;
    } else if (diffDays === 2 && streakShields > 0) {
      // Missed one day but have a shield
      streakShields -= 1;
      streakDays += 1;
    } else {
      // Streak broken
      streakDays = 1;
      streakBroken = true;
    }
  } else {
    // First time ever
    streakDays = 1;
  }

  if (streakDays > longestStreak) {
    longestStreak = streakDays;
  }

  await supabase
    .from("user_profiles")
    .update({
      last_active_date: today,
      current_streak_days: streakDays,
      longest_streak_days: longestStreak,
      streak_shields: streakShields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { streakDays, streakBroken };
}

// ── Achievement unlock ─────────────────────────────────────────────────

const CRITERIA_COUNTER_MAP: Record<string, keyof UserProfile> = {
  total_orders: "total_orders_created",
  total_clients: "total_clients_created",
  total_products: "total_products_created",
  total_tonnage: "total_tonnage_processed",
};

export async function checkAndUnlockAchievements(
  supabase: SupabaseClient,
  userId: string,
  _actionType: string,
): Promise<AchievementDefinition[]> {
  const [{ data: allDefs }, { data: userAch }, { data: profile }] =
    await Promise.all([
      supabase.from("achievement_definitions").select("*"),
      supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId),
      supabase.from("user_profiles").select("*").eq("id", userId).single(),
    ]);

  if (!allDefs || !profile) return [];

  const unlockedIds = new Set(
    (userAch ?? []).map((a: { achievement_id: string }) => a.achievement_id),
  );
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const def of allDefs as AchievementDefinition[]) {
    if (unlockedIds.has(def.id)) continue;
    if (!def.criteria_type || !def.criteria_target) continue;

    const target = def.criteria_target as Record<string, unknown>;
    const threshold = Number(target.threshold ?? target.count ?? 0);
    let qualifies = false;

    if (def.criteria_type === "count") {
      const field =
        CRITERIA_COUNTER_MAP[target.field as string] ??
        (target.field as keyof UserProfile);
      const current = Number((profile as Record<string, unknown>)[field] ?? 0);
      qualifies = current >= threshold;
    } else if (def.criteria_type === "cumulative") {
      const current = Number(profile.total_tonnage_processed ?? 0);
      qualifies = current >= threshold;
    } else if (def.criteria_type === "streak") {
      const current = Math.max(
        Number(profile.current_streak_days ?? 0),
        Number(profile.longest_streak_days ?? 0),
      );
      qualifies = current >= threshold;
    }

    if (qualifies) {
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: def.id })
        .select()
        .single();
      if (!error) newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}

// ── Quest progress ─────────────────────────────────────────────────────

const ACTION_TO_QUEST_TARGET: Record<string, string[]> = {
  order_created: ["create_order", "order_created"],
  order_cumplida: ["complete_order", "order_cumplida"],
  order_assembled: ["assemble_order", "order_assembled"],
  client_created: ["create_client", "client_created"],
  product_created: ["create_product", "product_created"],
  product_updated: ["update_product", "product_updated"],
  simulator_used: ["use_simulator", "simulator_used"],
};

export async function updateQuestProgress(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
): Promise<{ xp_reward: number; title: string | null }[]> {
  const targets = ACTION_TO_QUEST_TARGET[actionType];
  if (!targets) return [];

  const { data: activeQuests } = await supabase
    .from("user_quests")
    .select("*, quest_definitions(*)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!activeQuests) return [];

  const completed: { xp_reward: number; title: string | null }[] = [];

  for (const uq of activeQuests) {
    const def = uq.quest_definitions;
    if (!def) continue;
    if (!targets.includes(def.target_action ?? "")) continue;

    const newProgress = (uq.current_progress ?? 0) + 1;
    const targetCount = uq.target_count ?? def.target_count ?? 1;
    const isDone = newProgress >= targetCount;

    const updates: Record<string, unknown> = {
      current_progress: newProgress,
    };
    if (isDone) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
      updates.xp_awarded = def.xp_reward ?? 0;
    }

    await supabase.from("user_quests").update(updates).eq("id", uq.id);

    if (isDone) {
      completed.push({ xp_reward: def.xp_reward ?? 0, title: def.title });
    }
  }

  return completed;
}

// ── Challenge assignment ───────────────────────────────────────────────

export async function ensureActiveChallenges(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("user_challenges")
    .select("challenge_id, period_start, challenge_definitions(duration)")
    .eq("user_id", userId)
    .gte("period_end", today);

  const hasDuration = (dur: string) =>
    (existing ?? []).some(
      (c: Record<string, unknown>) =>
        (c.challenge_definitions as Record<string, unknown> | null)?.duration === dur,
    );

  const durations: { dur: string; count: number; start: string; end: string }[] = [];

  const todayDate = new Date(today + "T00:00:00Z");

  if (!hasDuration("daily")) {
    durations.push({ dur: "daily", count: 3, start: today, end: today });
  }
  if (!hasDuration("weekly")) {
    const day = todayDate.getUTCDay();
    const monday = new Date(todayDate);
    monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    durations.push({
      dur: "weekly",
      count: 2,
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    });
  }
  if (!hasDuration("monthly")) {
    const monthStart = today.slice(0, 7) + "-01";
    const nextMonth = new Date(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0);
    const monthEnd = nextMonth.toISOString().slice(0, 10);
    durations.push({ dur: "monthly", count: 1, start: monthStart, end: monthEnd });
  }

  if (durations.length === 0) return;

  const { data: allDefs } = await supabase
    .from("challenge_definitions")
    .select("id, duration")
    .eq("is_active", true);

  if (!allDefs) return;

  const rows: Record<string, unknown>[] = [];
  for (const { dur, count, start, end } of durations) {
    const pool = allDefs.filter((d: { duration: string }) => d.duration === dur);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    for (const ch of picked) {
      rows.push({
        user_id: userId,
        challenge_id: ch.id,
        period_start: start,
        period_end: end,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("user_challenges").insert(rows);
  }
}

// ── Challenge progress ─────────────────────────────────────────────────

const ACTION_TO_CONDITION: Record<string, string[]> = {
  order_created: ["orders_created", "order_created"],
  order_cumplida: ["orders_completed", "order_cumplida"],
  order_assembled: ["orders_assembled", "order_assembled"],
  client_created: ["clients_created", "client_created"],
  product_created: ["products_created", "product_created"],
};

export async function updateChallengeProgress(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  metadata?: Record<string, unknown>,
): Promise<{ xp_reward: number; name: string | null }[]> {
  const conditions = ACTION_TO_CONDITION[actionType];
  if (!conditions) return [];

  const today = new Date().toISOString().slice(0, 10);
  const { data: active } = await supabase
    .from("user_challenges")
    .select("*, challenge_definitions(*)")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .gte("period_end", today);

  if (!active) return [];

  const completed: { xp_reward: number; name: string | null }[] = [];

  for (const uc of active) {
    const def = uc.challenge_definitions;
    if (!def) continue;
    if (!conditions.includes(def.condition_type ?? "")) continue;

    const increment = def.condition_type?.includes("tonnage")
      ? Number(metadata?.tonnage ?? 1)
      : 1;
    const newProgress = (uc.current_progress ?? 0) + increment;
    const isDone = newProgress >= (def.condition_threshold ?? 1);

    const updates: Record<string, unknown> = {
      current_progress: newProgress,
    };
    if (isDone) {
      updates.is_completed = true;
      updates.completed_at = new Date().toISOString();
      updates.xp_awarded = def.xp_reward ?? 0;
    }

    await supabase.from("user_challenges").update(updates).eq("id", uc.id);

    if (isDone) {
      completed.push({ xp_reward: def.xp_reward ?? 0, name: def.name });
    }
  }

  return completed;
}

// ── Mastery path XP ────────────────────────────────────────────────────

const MASTERY_TIER_THRESHOLDS = [0, 500, 2000, 5000, 12000];

const ACTION_TO_MASTERY: Record<string, string> = {
  order_created: "order_flow",
  order_cumplida: "order_flow",
  order_assembled: "order_flow",
  status_updated: "order_flow",
  client_created: "client_relations",
  product_created: "product_specialist",
  product_updated: "product_specialist",
};

export async function updateMasteryPathXP(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  xpAmount: number,
): Promise<void> {
  const pathKey = ACTION_TO_MASTERY[actionType];
  if (!pathKey) return;

  const { data: path } = await supabase
    .from("mastery_paths")
    .select("id, domain_xp, current_tier")
    .eq("user_id", userId)
    .eq("path_key", pathKey)
    .single();

  if (!path) return;

  const newXP = ((path.domain_xp ?? 0) as number) + xpAmount;
  let newTier = (path.current_tier ?? 0) as number;
  for (let i = MASTERY_TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (newXP >= MASTERY_TIER_THRESHOLDS[i]) {
      newTier = i;
      break;
    }
  }

  const updates: Record<string, unknown> = { domain_xp: newXP };
  if (newTier > ((path.current_tier ?? 0) as number)) {
    updates.current_tier = newTier;
    updates.tier_unlocked_at = new Date().toISOString();
  }

  await supabase.from("mastery_paths").update(updates).eq("id", path.id);
}
