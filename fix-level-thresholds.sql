-- fix-level-thresholds.sql
-- Align level_definitions.xp_required with LEVEL_THRESHOLDS from src/lib/gamification.ts
-- Only updates xp_required; leaves title_en, title_es, and perk_description unchanged.

UPDATE public.level_definitions SET xp_required = 0     WHERE level = 1;
UPDATE public.level_definitions SET xp_required = 100   WHERE level = 2;
UPDATE public.level_definitions SET xp_required = 250   WHERE level = 3;
UPDATE public.level_definitions SET xp_required = 500   WHERE level = 4;
UPDATE public.level_definitions SET xp_required = 850   WHERE level = 5;
UPDATE public.level_definitions SET xp_required = 1300  WHERE level = 6;
UPDATE public.level_definitions SET xp_required = 1900  WHERE level = 7;
UPDATE public.level_definitions SET xp_required = 2650  WHERE level = 8;
UPDATE public.level_definitions SET xp_required = 3600  WHERE level = 9;
UPDATE public.level_definitions SET xp_required = 4800  WHERE level = 10;
UPDATE public.level_definitions SET xp_required = 6300  WHERE level = 11;
UPDATE public.level_definitions SET xp_required = 8100  WHERE level = 12;
