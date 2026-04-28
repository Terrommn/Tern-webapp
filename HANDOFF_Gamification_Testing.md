# TerniumFlow Gamification System - Testing Handoff Document

**Date:** 2026-04-28
**Project:** TerniumFlow (SteelFlow Pro)
**Stack:** Next.js 14+, React, Supabase (Postgres + Auth), TypeScript, Tailwind CSS
**Objective:** Test and validate the complete gamification system, identify bugs, and verify integration readiness.

---

## 1. SYSTEM OVERVIEW

TerniumFlow is a steel industry order management platform with a non-competitive gamification layer. The gamification system includes:

- **XP & Levels** (25 levels, steel-themed titles)
- **Daily Rings** (Apple Activity-style: Flow, Tonnage, Reach)
- **Streaks** (consecutive days with shield protection)
- **Achievements** (55 badges across 5 tiers: acero/cobre/plata/oro/platino)
- **Quests** (32 total: 12 onboarding chain + 10 weekly + 10 monthly)
- **Challenges** (20: daily/weekly/monthly with bronze/silver/gold tiers)
- **Mastery Paths** (3 skill trees: Order Flow, Client Relations, Product Specialist)
- **Cosmetics** (titles, backgrounds, themes, frames unlocked via achievements)

---

## 2. FILE STRUCTURE

### Core Logic
- `src/lib/gamification.ts` — Core functions: awardXP, trackActivity, updateRingProgress, checkAndUpdateStreak, getLevelForXP, getXPForNextLevel, getOrCreateDailyActivity
- `src/types/gamification.ts` — All TypeScript interfaces (UserProfile, DailyActivity, AchievementDefinition, QuestDefinition, ChallengeDefinition, etc.)
- `src/lib/hooks/useGamification.ts` — React hook wrapping core functions

### Context Provider
- `src/components/steelflow/GamificationProvider.tsx` — React Context with awardXP, refreshProfile, toast management. **NOT mounted in app layout.**

### UI Components
- `src/components/steelflow/XPToast.tsx` — Toast notifications for XP awards
- `src/components/steelflow/MilestoneOverlay.tsx` — Full-screen modal for milestones
- `src/components/steelflow/SteelRings.tsx` — SVG daily activity rings
- `src/components/steelflow/ProgressCard.tsx` — Level/XP/streak card
- `src/components/steelflow/AchievementGrid.tsx` — Filterable achievement grid
- `src/components/steelflow/AchievementsSection.tsx` — Simpler achievement grid variant
- `src/components/steelflow/MasteryPathView.tsx` — 3-path skill tree visualization
- `src/components/steelflow/QuestProgressPill.tsx` — Floating quest progress indicator
- `src/components/steelflow/ChallengesCard.tsx` — Active challenges display
- `src/components/steelflow/ActivityHeatmap.tsx` — 52-week GitHub-style heatmap

### Pages (Server Components)
- `src/app/progreso/page.tsx` — Progress dashboard (level, XP history, mastery paths, achievements, personal records, recent activity)
- `src/app/desafios/page.tsx` — Challenges page (daily/weekly/monthly with progress)
- `src/app/misiones/page.tsx` — Quests page (onboarding, active quests, narrative)
- `src/app/page.tsx` — Main dashboard (gamification summary card in sidebar)

### Database
- `gamification-schema.sql` — Complete 18-table schema with seed data, RLS policies, indexes, and triggers

---

## 3. DATABASE SCHEMA (18 tables)

### Reference Tables (read-only)
| Table | Records | Purpose |
|---|---|---|
| level_definitions | 12 | XP thresholds and steel-themed rank names |
| achievement_definitions | 55 | Badge definitions with categories and tiers |
| quest_definitions | 32 | Onboarding/weekly/monthly quest templates |
| challenge_definitions | 20 | Daily/weekly/monthly challenge templates |
| seasonal_events | 0 | Extensible seasonal content |

### User State Tables
| Table | Purpose |
|---|---|
| user_profiles | Central hub: XP, level, streaks, ring targets, cosmetics, counters |
| xp_events | Immutable XP transaction ledger |
| user_activity_log | Granular action tracking with JSONB metadata |
| daily_activity | 1 row/user/day: ring progress, heatmap, activity details |
| streak_history | Historical streak records |
| user_achievements | Unlocked badges per user |
| user_achievement_progress | Incremental progress toward locked badges |
| mastery_paths | 3 rows/user: skill tree tier progression |
| user_quests | Active/completed quest tracking |
| user_challenges | Assigned challenge progress per period |
| user_cosmetics | Unlocked cosmetic rewards |
| user_personal_records | 11 record types (best day, longest streak, etc.) |
| weekly_recaps | Generated weekly summaries |

### Key Relationships
- All user tables FK → user_profiles.id (= auth.users.id UUID)
- CASCADE DELETE on all user data when auth user deleted
- Trigger `on_auth_user_created` auto-creates: user_profiles + 3 mastery_paths + onboarding quests

---

## 4. XP VALUES CONFIGURATION

```typescript
export const XP_VALUES = {
  order_created: 25,
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
};
```

### Level Thresholds (25 levels)
Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 5: 1000 XP, Level 10: 8000 XP, Level 15: 20000 XP, Level 20: 45000 XP, Level 25: 85000 XP

---

## 5. KNOWN ISSUES & GAPS (Critical for Testing)

### P0 - System is Non-Functional
1. **GamificationProvider is never mounted** in `src/app/layout.tsx` or any layout. The React context is inaccessible.
2. **All 4 XP integration points are commented out:**
   - `OrdersWorkspace.tsx:235` — `// awardXP(supabase, userId, 'order_created', 25, ...)`
   - `ClientsDirectory.tsx:131` — `// awardXP(supabase, userId, 'client_created', 30, ...)`
   - `ProductsWorkspace.tsx:209` — `// awardXP(supabase, userId, 'product_created', 30, ...)`
   - `ProductsWorkspace.tsx:256` — `// awardXP(supabase, userId, 'product_updated', 20, ...)`
3. **No real authentication** — Login page uses fake session cookie, `DEMO_USER_ID` hardcoded in progreso/page.tsx.

### P1 - Missing Backend Logic
4. **No achievement unlock logic** — Definitions exist but nothing checks criteria and awards badges.
5. **No quest progress tracking** — No code updates `user_quests.current_progress`.
6. **No challenge assignment/rotation** — No scheduled job creates daily/weekly/monthly challenge assignments.
7. **No weekly recap generation** — Table exists but no generation logic.
8. **Tonnage ring never updates** — `updateRingProgress` is never called with `ringType: "tonnage"`.
9. **No mastery path XP accumulation** — Domain XP never incremented.

### P2 - Design Issues
10. **Duplicate APIs** — Both `useGamificationContext()` (provider-based) and `useGamification()` (standalone hook) exist. Consolidate to one.
11. **No error handling** in awardXP — Failures silently ignored.
12. **No rate limiting** on XP awards — Could spam actions for infinite XP.
13. **Ring targets hardcoded** — flow: 5, tonnage: 50, reach: 3 set in schema defaults, no admin UI to configure.

---

## 6. TEST PLAN

### Phase 1: Database & Schema Validation
- [ ] Run `gamification-schema.sql` against a fresh Supabase instance
- [ ] Verify all 18 tables created with correct columns and types
- [ ] Verify 97 seed records inserted (12 levels + 55 achievements + 32 quests + 20 challenges) minus seasonal_events
- [ ] Test `on_auth_user_created` trigger: create auth user, verify user_profiles + 3 mastery_paths + onboarding quests auto-created
- [ ] Test RLS: verify users can only read/write their own data
- [ ] Test CASCADE: delete auth user, verify all gamification data deleted
- [ ] Verify all 18 indexes created

### Phase 2: Core Function Unit Tests
Test each function in `src/lib/gamification.ts`:

#### getLevelForXP(xp)
- [ ] `getLevelForXP(0)` → 1
- [ ] `getLevelForXP(99)` → 1
- [ ] `getLevelForXP(100)` → 2
- [ ] `getLevelForXP(300)` → 3
- [ ] `getLevelForXP(85000)` → 25
- [ ] `getLevelForXP(999999)` → 25 (cap)

#### getXPForNextLevel(xp)
- [ ] `getXPForNextLevel(0)` → 100
- [ ] `getXPForNextLevel(50)` → 100
- [ ] `getXPForNextLevel(100)` → 300
- [ ] `getXPForNextLevel(85000)` → 85000 (already max)

#### awardXP(supabase, userId, actionType, xpAmount, ...)
- [ ] Awards correct XP amount and inserts xp_events row
- [ ] Updates user_profiles.total_xp correctly
- [ ] Detects level-up: returns `{ leveledUp: true, newLevel: N }`
- [ ] Updates user_profiles.current_level on level-up
- [ ] Does NOT update current_level when no level-up
- [ ] Handles non-existent user gracefully

#### getOrCreateDailyActivity(supabase, userId)
- [ ] Creates new row when none exists for today
- [ ] Returns existing row when already created today
- [ ] Initializes ring targets from user_profiles
- [ ] Sets correct activity_date (today)

#### updateRingProgress(supabase, userId, ringType, incrementValue)
- [ ] Increments ring_flow_count by 1 for flow ring
- [ ] Increments ring_tonnage_value for tonnage ring
- [ ] Increments ring_reach_count for reach ring
- [ ] Calculates rings_closed correctly (0-3)
- [ ] Sets is_triple_close=true when all 3 rings reach targets
- [ ] Does NOT decrement rings_closed if ring was already closed

#### checkAndUpdateStreak(supabase, userId)
- [ ] Increments streak for consecutive day
- [ ] Resets streak to 1 when gap > 2 days
- [ ] Uses streak_shield when gap = 1 day and shields > 0
- [ ] Does NOT use shield when shields = 0
- [ ] Updates longest_streak_days when current > longest
- [ ] Updates last_active_date to today
- [ ] Returns `{ streakDays, streakBroken }` correctly

### Phase 3: UI Component Rendering
- [ ] ProgressCard renders level, XP bar, streak correctly
- [ ] SteelRings renders 3 rings with correct colors (red/amber/green)
- [ ] SteelRings shows ring closure count correctly
- [ ] AchievementGrid filters by category correctly
- [ ] AchievementGrid shows locked/unlocked/hidden states
- [ ] AchievementsSection renders tier colors correctly
- [ ] MasteryPathView renders 3 paths with tier progression
- [ ] ChallengesCard renders progress bars with tier colors
- [ ] QuestProgressPill shows correct completion ratio
- [ ] XPToast appears and auto-dismisses after 3s
- [ ] MilestoneOverlay renders and auto-dismisses after 4s
- [ ] ActivityHeatmap renders 52-week grid with correct color levels

### Phase 4: Page-Level Integration
- [ ] `/progreso` loads and displays: level, XP, streak, achievements, mastery paths, XP history chart, personal records, recent activity
- [ ] `/desafios` loads and displays: daily/weekly/monthly challenges grouped correctly
- [ ] `/misiones` loads and displays: active quests by type, onboarding progress, narrative text
- [ ] `/` (dashboard) shows gamification summary card with level/XP/streak

### Phase 5: Integration Points (After Uncommenting)
- [ ] Creating an order awards 25 XP and updates flow ring
- [ ] Creating a client awards 30 XP and updates reach ring
- [ ] Creating a product awards 30 XP
- [ ] Updating a product awards 20 XP
- [ ] XP toast appears after each award
- [ ] Level-up triggers appropriate notification
- [ ] Profile refreshes after XP award

### Phase 6: Edge Cases
- [ ] XP award with no active session → graceful error
- [ ] Rapid consecutive XP awards → all processed correctly
- [ ] Ring already closed → stays closed on additional increments
- [ ] Max level (25) → no further level-ups, XP still accumulates
- [ ] Streak shield at 0 → streak breaks on missed day
- [ ] Multiple triple closes in same day → handled correctly
- [ ] Achievement already unlocked → no duplicate
- [ ] Daily activity row already exists → reuses, doesn't duplicate

---

## 7. RECOMMENDED FIX SEQUENCE

To make the system functional for testing:

### Step 1: Mount GamificationProvider
```tsx
// src/app/layout.tsx — wrap children with:
<GamificationProvider>
  {children}
</GamificationProvider>
```

### Step 2: Uncomment Integration Points
Uncomment the 4 awardXP calls in OrdersWorkspace, ClientsDirectory, ProductsWorkspace.

### Step 3: Wire Up Authentication
Replace DEMO_USER_ID with actual `supabase.auth.getUser()` calls, or set up a proper demo auth flow.

### Step 4: Add Achievement Check Logic
After each awardXP call, check if any achievement criteria are now met and unlock accordingly.

### Step 5: Add Quest Progress Updates
After relevant actions, increment `user_quests.current_progress` for matching active quests.

---

## 8. SIMPLIFICATION RECOMMENDATION

### Current Architecture (Complex)
```
Component → manual awardXP() call → gamification.ts → Supabase
Component → manual updateRingProgress() → gamification.ts → Supabase
Component → manual trackActivity() → gamification.ts → Supabase
```
Each component must know about gamification, import functions, pass correct params.

### Proposed Architecture (Simple Event Bus)
```
Component → emit('order_created', { order }) → done

GameEventListener (centralized):
  on 'order_created' → awardXP + updateRing('flow') + updateRing('tonnage') + checkAchievements + updateQuests
  on 'client_created' → awardXP + updateRing('reach') + checkAchievements + updateQuests
  on 'daily_login' → checkStreak + awardXP
```

**Benefits:**
- Components don't import gamification code
- All gamification logic in one file
- Easy to add/remove/disable rewards
- Natural fit for achievement/quest checking
- Testable in isolation

### Implementation Sketch
```typescript
// src/lib/gamification-events.ts
type GameEvent =
  | { type: 'order_created'; order: { id: string; net_weight_ton: number } }
  | { type: 'order_completed'; orderId: string }
  | { type: 'client_created'; clientId: string }
  | { type: 'product_created'; productId: string }
  | { type: 'product_updated'; productId: string }
  | { type: 'daily_login' }
  | { type: 'search_used' }
  | { type: 'view_detail'; entityType: string; entityId: string };

class GamificationEventBus {
  private listeners: Map<string, Function[]> = new Map();

  emit(event: GameEvent) { /* dispatch to listeners */ }
  on(type: string, handler: Function) { /* register */ }

  // Pre-registered handlers:
  private handleOrderCreated(event) {
    await awardXP(supabase, userId, 'order_created', 25, 'order', event.order.id);
    await updateRingProgress(supabase, userId, 'flow', 1);
    if (event.order.net_weight_ton > 0) {
      await updateRingProgress(supabase, userId, 'tonnage', event.order.net_weight_ton);
    }
    await this.checkAchievements(userId);
    await this.updateQuestProgress(userId, 'order_created');
  }
}

export const gameEvents = new GamificationEventBus();
```

---

## 9. ENVIRONMENT SETUP FOR TESTING

1. Clone repo and install: `npm install`
2. Set up Supabase project (local or cloud)
3. Run `gamification-schema.sql` against the database
4. Configure `.env.local` with Supabase URL and anon key
5. Run dev server: `npm run dev`
6. Navigate to `/progreso`, `/desafios`, `/misiones` to verify UI rendering
7. Check browser console for Supabase connection errors

---

## 10. KEY CONSTANTS & DEMO DATA

- **DEMO_USER_ID:** `"00000000-0000-0000-0000-000000000001"` (hardcoded in progreso/page.tsx)
- **Ring Defaults:** flow_target=5, tonnage_target=50, reach_target=3
- **Max Level:** 25 (85,000 XP)
- **Streak Shields:** Max 3, regenerate 1 per 7-day streak
- **Toast Duration:** 3 seconds
- **Milestone Overlay Duration:** 4 seconds

---

*Generated by Claude Code on 2026-04-28. This document covers the complete gamification system state for handoff to a testing agent/LLM.*
