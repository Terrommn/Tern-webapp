-- fix-onboarding-quests.sql
-- Backfill onboarding quests, mastery paths, and current-period challenges
-- for existing users who were created before the on_auth_user_created trigger.
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Seed mastery_paths for users missing them
--    (the trigger creates 3 rows per user)
-- ============================================================================
INSERT INTO public.mastery_paths (user_id, path_key)
SELECT up.id, p.path_key
FROM public.user_profiles up
CROSS JOIN (VALUES ('order_flow'), ('client_relations'), ('product_specialist')) AS p(path_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.mastery_paths mp
  WHERE mp.user_id = up.id AND mp.path_key = p.path_key
)
ON CONFLICT (user_id, path_key) DO NOTHING;

-- ============================================================================
-- 2. Seed onboarding quests for users who don't have them
--    Mirrors the handle_new_user() trigger logic exactly.
-- ============================================================================
INSERT INTO public.user_quests (user_id, quest_id, target_count)
SELECT up.id, qd.id, qd.target_count
FROM public.user_profiles up
CROSS JOIN public.quest_definitions qd
WHERE qd.quest_type = 'onboarding'
  AND qd.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.user_quests uq
    WHERE uq.user_id = up.id AND uq.quest_id = qd.id
  )
ON CONFLICT (user_id, quest_id) DO NOTHING;

-- ============================================================================
-- 3. Seed current-period challenges for users who don't have them yet
--    - daily   : today
--    - weekly  : current Mon-Sun week
--    - monthly : current calendar month
-- ============================================================================
INSERT INTO public.user_challenges (user_id, challenge_id, period_start, period_end)
SELECT up.id, cd.id,
  CASE cd.duration
    WHEN 'daily'   THEN CURRENT_DATE
    WHEN 'weekly'  THEN date_trunc('week', CURRENT_DATE)::date
    WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)::date
  END AS period_start,
  CASE cd.duration
    WHEN 'daily'   THEN CURRENT_DATE
    WHEN 'weekly'  THEN (date_trunc('week', CURRENT_DATE) + interval '6 days')::date
    WHEN 'monthly' THEN (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
  END AS period_end
FROM public.user_profiles up
CROSS JOIN public.challenge_definitions cd
WHERE cd.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.user_challenges uc
    WHERE uc.user_id    = up.id
      AND uc.challenge_id = cd.id
      AND uc.period_start = CASE cd.duration
            WHEN 'daily'   THEN CURRENT_DATE
            WHEN 'weekly'  THEN date_trunc('week', CURRENT_DATE)::date
            WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)::date
          END
  );

COMMIT;
