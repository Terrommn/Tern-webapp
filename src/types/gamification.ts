// ── Gamification Types ──────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  display_name: string | null;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  perfect_streak_days: number;
  streak_shields: number;
  last_active_date: string | null;
  ring_flow_target: number;
  ring_tonnage_target: number;
  ring_reach_target: number;
  active_title: string | null;
  active_background: string | null;
  active_sidebar_theme: string | null;
  active_accent_color: string | null;
  active_avatar_frame: string | null;
  onboarding_completed: boolean;
  sound_enabled: boolean;
  total_orders_created: number;
  total_tonnage_processed: number;
  total_clients_created: number;
  total_products_created: number;
  created_at: string;
  updated_at: string;
};

export type LevelDefinition = {
  level: number;
  title_en: string | null;
  title_es: string | null;
  xp_required: number;
  perk_description: string | null;
};

export type XPEvent = {
  id: number;
  user_id: string;
  action_type: string;
  xp_amount: number;
  entity_type: string | null;
  entity_id: string | null;
  source: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DailyActivity = {
  id: string;
  user_id: string;
  activity_date: string;
  ring_flow_count: number;
  ring_flow_target: number;
  ring_tonnage_value: number;
  ring_tonnage_target: number;
  ring_reach_count: number;
  ring_reach_target: number;
  rings_closed: number;
  is_triple_close: boolean;
  heatmap_score: number;
  heatmap_level: number;
  streak_maintained: boolean;
  orders_created: number;
  orders_completed: number;
  xp_earned: number;
  distinct_clients: string[];
  distinct_products: string[];
  distinct_plants: string[];
  first_activity_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AchievementCategory =
  | "order_management"
  | "client_relations"
  | "product_knowledge"
  | "system_mastery"
  | "consistency";

export type AchievementTier =
  | "acero"
  | "cobre"
  | "plata"
  | "oro"
  | "platino";

export type AchievementDefinition = {
  id: string;
  slug: string;
  name_es: string | null;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  category: AchievementCategory;
  tier: AchievementTier;
  xp_value: number;
  icon_name: string | null;
  is_hidden: boolean;
  sort_order: number;
  criteria_type: string | null;
  criteria_target: Record<string, unknown> | null;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  is_featured: boolean;
  notified: boolean;
};

export type UserAchievementProgress = {
  id: string;
  user_id: string;
  achievement_id: string;
  current_value: number;
  target_value: number;
  last_updated: string;
};

export type MasteryPath = {
  id: number;
  user_id: string;
  path_key: "order_flow" | "client_relations" | "product_specialist";
  current_tier: number;
  domain_xp: number;
  tier_unlocked_at: string | null;
};

export type QuestType = "onboarding" | "weekly" | "monthly" | "seasonal";

export type QuestDefinition = {
  id: string;
  quest_type: QuestType;
  title: string | null;
  description: string | null;
  narrative_text: string | null;
  icon: string | null;
  xp_reward: number;
  target_count: number;
  target_action: string | null;
  chain_id: string | null;
  chain_order: number | null;
  cosmetic_reward_type: string | null;
  cosmetic_reward_value: string | null;
};

export type QuestStatus = "active" | "completed" | "expired" | "locked";

export type UserQuest = {
  id: string;
  user_id: string;
  quest_id: string;
  status: QuestStatus;
  current_progress: number;
  target_count: number;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  xp_awarded: number;
};

export type ChallengeTier = "bronze" | "silver" | "gold";
export type ChallengeDuration = "daily" | "weekly" | "monthly";

export type ChallengeDefinition = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  tier: ChallengeTier;
  duration: ChallengeDuration;
  xp_reward: number;
  condition_type: string | null;
  condition_threshold: number;
  condition_extra: Record<string, unknown> | null;
};

export type UserChallenge = {
  id: string;
  user_id: string;
  challenge_id: string;
  period_start: string;
  period_end: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  xp_awarded: number;
  rerolled: boolean;
};

export type UserPersonalRecord = {
  id: string;
  user_id: string;
  record_type: string;
  record_value: number;
  record_date: string;
  record_detail: string | null;
  previous_value: number | null;
};

export type WeeklyRecap = {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  total_orders: number;
  total_tonnage: number;
  days_with_activity: number;
  rings_closed_total: number;
  triple_close_days: number;
  challenges_completed: number;
  xp_earned: number;
  streak_at_week_end: number;
  orders_vs_prev_week: number | null;
  tonnage_vs_prev_week: number | null;
  personal_bests: Record<string, unknown> | null;
  is_read: boolean;
};

// ── Toast type used by the gamification UI ──────────────────────────────

export type XPToastItem = {
  id: string;
  message: string;
  xpAmount: number;
};
