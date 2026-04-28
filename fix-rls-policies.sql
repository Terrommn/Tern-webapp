-- ============================================================================
-- FIX RLS POLICIES — Run this in Supabase SQL Editor
-- Date: 2026-04-28
-- Fixes: 403 on xp_events INSERT, 406 on level_definitions, 400 on clients/products/orders
-- ============================================================================

-- 1. xp_events: add missing INSERT policy (fixes 403 on awardXP)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'xp_events' AND policyname = 'Users create own xp events'
  ) THEN
    CREATE POLICY "Users create own xp events"
      ON public.xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. level_definitions: add SELECT policy (fixes 406)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'level_definitions' AND policyname = 'Public read level definitions'
  ) THEN
    ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public read level definitions"
      ON public.level_definitions FOR SELECT USING (true);
  END IF;
END $$;

-- 3. clients: allow authenticated users full access (fixes 400 on POST)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Authenticated users manage clients'
  ) THEN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Authenticated users manage clients"
      ON public.clients FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. products: allow authenticated users full access (fixes 400 on POST/PATCH)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users manage products'
  ) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Authenticated users manage products"
      ON public.products FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. orders: allow authenticated users full access (fixes potential 400s)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Authenticated users manage orders'
  ) THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Authenticated users manage orders"
      ON public.orders FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Verify: list all policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
