"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  awardXP,
  checkAndUpdateStreak,
  getOrCreateDailyActivity,
  updateRingProgress,
  XP_VALUES,
} from "@/lib/gamification";
import type { DailyActivity, UserProfile } from "@/types/gamification";

export function useGamification() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    const activity = await getOrCreateDailyActivity(supabase, user.id);
    setDailyActivity(activity);

    // Check / update streak on mount
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

  const awardXPAction = useCallback(
    async (
      actionType: string,
      entityType?: string,
      entityId?: string,
    ): Promise<{
      xpAmount: number;
      leveledUp: boolean;
      newLevel: number;
    } | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const xpAmount = XP_VALUES[actionType] ?? 10;

      const result = await awardXP(
        supabase,
        user.id,
        actionType,
        xpAmount,
        entityType,
        entityId,
      );

      // Update ring progress based on action type
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

      // Refresh local state
      await refreshProfile();

      return {
        xpAmount,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
      };
    },
    [supabase, refreshProfile],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    dailyActivity,
    loading,
    awardXPAction,
    refreshProfile,
  };
}
