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
  checkAndUnlockAchievements,
  ensureActiveChallenges,
  getOrCreateDailyActivity,
  updateChallengeProgress,
  updateDailyActivityCounters,
  updateMasteryPathXP,
  updateQuestProgress,
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
import { MilestoneOverlay } from "./MilestoneOverlay";
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
    metadata?: Record<string, unknown>,
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
  const [milestone, setMilestone] = useState<{
    visible: boolean;
    title: string;
    description: string;
    xp: number;
    icon: string;
  }>({ visible: false, title: "", description: "", xp: 0, icon: "emoji_events" });

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
    await ensureActiveChallenges(supabase, user.id);

    setLoading(false);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profileData }, { data: questsData }, { data: achievementsData }] =
      await Promise.all([
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

    if (profileData) setProfile(profileData as UserProfile);
    if (questsData) setQuests(questsData as UserQuest[]);
    if (achievementsData) setAchievements(achievementsData as UserAchievement[]);

    const activity = await getOrCreateDailyActivity(supabase, user.id);
    setDailyActivity(activity);
  }, [supabase]);

  // ── Award XP action ─────────────────────────────────────────────────

  const isAwardingRef = useRef(false);

  const awardXP = useCallback(
    async (
      actionType: string,
      entityType?: string,
      entityId?: string,
      description?: string,
      metadata?: Record<string, unknown>,
    ) => {
      if (isAwardingRef.current) return;
      isAwardingRef.current = true;
      try {
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
          metadata,
        );

        await updateDailyActivityCounters(supabase, user.id, actionType, xpAmount);

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
        if (
          (actionType === "order_created" || actionType === "order_cumplida") &&
          metadata?.tonnage
        ) {
          await updateRingProgress(
            supabase,
            user.id,
            "tonnage",
            Number(metadata.tonnage),
          );
        }

        // Achievement check
        try {
          const newAchievements = await checkAndUnlockAchievements(
            supabase,
            user.id,
            actionType,
          );
          for (const ach of newAchievements) {
            pushToast(ach.name_es ?? "Logro desbloqueado", ach.xp_value);
          }
        } catch {
          // achievement failure should not block XP flow
        }

        // Quest progress
        try {
          const completedQuests = await updateQuestProgress(
            supabase,
            user.id,
            actionType,
          );
          for (const q of completedQuests) {
            pushToast(q.title ?? "Mision completada", q.xp_reward);
          }
        } catch {
          // quest failure should not block XP flow
        }

        // Challenge progress
        try {
          const completedChallenges = await updateChallengeProgress(
            supabase,
            user.id,
            actionType,
            metadata,
          );
          for (const c of completedChallenges) {
            pushToast(c.name ?? "Desafio completado", c.xp_reward);
          }
        } catch {
          // challenge failure should not block XP flow
        }

        // Mastery path
        try {
          await updateMasteryPathXP(supabase, user.id, actionType, xpAmount);
        } catch {
          // mastery failure should not block XP flow
        }

        // Show toast
        pushToast(label, xpAmount);

        if (result.leveledUp) {
          pushToast(`Nivel ${result.newLevel} alcanzado`, 0);
          setMilestone({
            visible: true,
            title: `Nivel ${result.newLevel}`,
            description: "Has subido de nivel. Sigue asi.",
            xp: xpAmount,
            icon: "emoji_events",
          });
        }

        await refreshProfile();
      } finally {
        isAwardingRef.current = false;
      }
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
      <MilestoneOverlay
        visible={milestone.visible}
        title={milestone.title}
        description={milestone.description}
        xp={milestone.xp}
        icon={milestone.icon}
        onDismiss={() => setMilestone((m) => ({ ...m, visible: false }))}
      />
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
