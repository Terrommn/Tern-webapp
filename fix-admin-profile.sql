-- ============================================================================
-- FIX: Create gamification profile for admin user
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Insert user_profile for admin (if not exists)
INSERT INTO public.user_profiles (id, display_name)
VALUES ('80fad792-20de-4ac1-a415-a3c3334a8902', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- 2. Initialize mastery paths for admin
INSERT INTO public.mastery_paths (user_id, path_key)
VALUES
  ('80fad792-20de-4ac1-a415-a3c3334a8902', 'order_flow'),
  ('80fad792-20de-4ac1-a415-a3c3334a8902', 'client_relations'),
  ('80fad792-20de-4ac1-a415-a3c3334a8902', 'product_specialist')
ON CONFLICT DO NOTHING;

-- 3. Assign onboarding quests for admin
INSERT INTO public.user_quests (user_id, quest_id, target_count)
SELECT '80fad792-20de-4ac1-a415-a3c3334a8902', id, target_count
FROM public.quest_definitions
WHERE quest_type = 'onboarding' AND is_active = TRUE
ON CONFLICT DO NOTHING;

-- 4. Also seed the operator if missing
-- Get operator user ID from auth.users
DO $$
DECLARE
  op_id UUID;
BEGIN
  SELECT id INTO op_id FROM auth.users
  WHERE email = 'vive.sinfronteras1@gmail.com' LIMIT 1;

  IF op_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (op_id, 'Operator')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.mastery_paths (user_id, path_key)
    VALUES (op_id, 'order_flow'), (op_id, 'client_relations'), (op_id, 'product_specialist')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verify
SELECT id, display_name, total_xp, current_level, current_streak_days
FROM public.user_profiles;
