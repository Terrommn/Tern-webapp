"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  awardXP as awardXPCore,
  checkAndUpdateStreak,
  getOrCreateDailyActivity,
  updateRingProgress,
  XP_VALUES,
} from "@/lib/gamification";
import type {
  AchievementDefinition,
  DailyActivity,
  UserAchievement,
  UserProfile,
  UserQuest,
  XPToastItem,
} from "@/types/gamification";
import { QuestProgressPill } from "./QuestProgressPill";
import { XPToast } from "./XPToast";

// ── Context shape ───────────────────────────────────────────────────────

type GamificationContextValue = {
  profile: UserProfile | null;
  dailyActivity: DailyActivity | null;
  quests: UserQuest[];
  achievements: UserAchievement[];
  loading: boolean;
  awardXP: (
    actionType: string,
    entityType?: string,
    entityId?: string,
    description?: string,
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const GamificationContext = createContext<GamificationContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────

export function GamificationProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(
    null,
  );
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<XPToastItem[]>([]);

  // ── Toast management ────────────────────────────────────────────────

  const pushToast = useCallback((message: string, xpAmount: number) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-2), { id, message, xpAmount }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Data fetching ───────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [profileRes, questsRes, achievementsRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("user_quests")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]),
      supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    if (questsRes.data) setQuests(questsRes.data as UserQuest[]);
    if (achievementsRes.data)
      setAchievements(achievementsRes.data as UserAchievement[]);

    const activity = await getOrCreateDailyActivity(supabase, user.id);
    setDailyActivity(activity);

    await checkAndUpdateStreak(supabase, user.id);

    setLoading(false);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) setProfile(profileData as UserProfile);

    const activity = await getOrCreateDailyActivity(supabase, user.id);
    setDailyActivity(activity);
  }, [supabase]);

  // ── Award XP action ─────────────────────────────────────────────────

  const awardXP = useCallback(
    async (
      actionType: string,
      entityType?: string,
      entityId?: string,
      description?: string,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const xpAmount = XP_VALUES[actionType] ?? 10;
      const label = description ?? actionType.replace(/_/g, " ");

      const result = await awardXPCore(
        supabase,
        user.id,
        actionType,
        xpAmount,
        entityType,
        entityId,
        "app",
        label,
      );

      // Update ring progress
      if (
        actionType === "order_created" ||
        actionType === "order_completed" ||
        actionType === "status_updated"
      ) {
        await updateRingProgress(supabase, user.id, "flow", 1);
      }
      if (actionType === "client_created") {
        await updateRingProgress(supabase, user.id, "reach", 1);
      }

      // Show toast
      pushToast(label, xpAmount);

      if (result.leveledUp) {
        pushToast(`Nivel ${result.newLevel} alcanzado`, 0);
      }

      await refreshProfile();
    },
    [supabase, pushToast, refreshProfile],
  );

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAll();
  }, [fetchAll]);

  const value = useMemo<GamificationContextValue>(
    () => ({
      profile,
      dailyActivity,
      quests,
      achievements,
      loading,
      awardXP,
      refreshProfile,
    }),
    [
      profile,
      dailyActivity,
      quests,
      achievements,
      loading,
      awardXP,
      refreshProfile,
    ],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
      <QuestProgressPill
        completedCount={quests.filter((q) => q.status === "completed").length}
        totalCount={quests.length}
        visible={quests.length > 0}
      />
      <XPToast toasts={toasts} onDismiss={dismissToast} />
    </GamificationContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useGamificationContext() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error(
      "useGamificationContext must be used inside <GamificationProvider>",
    );
  }
  return ctx;
}
