import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyActivity, UserProfile } from "@/types/gamification";

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
): Promise<{ newTotalXP: number; newLevel: number; leveledUp: boolean }> {
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
    console.error("[gamification] Failed to insert xp_event:", insertError.message, insertError.code);
  }

  // 2. Fetch current profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("total_xp, current_level")
    .eq("id", userId)
    .single();

  const currentXP = (profile?.total_xp ?? 0) as number;
  const oldLevel = (profile?.current_level ?? 1) as number;
  const newTotalXP = currentXP + xpAmount;
  const newLevel = getLevelForXP(newTotalXP);
  const leveledUp = newLevel > oldLevel;

  // 3. Update profile
  const updates: Record<string, unknown> = {
    total_xp: newTotalXP,
    updated_at: new Date().toISOString(),
  };
  if (leveledUp) {
    updates.current_level = newLevel;
  }

  await supabase.from("user_profiles").update(updates).eq("id", userId);

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
