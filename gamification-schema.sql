-- ============================================================================
-- STEELFLOW PRO - GAMIFICATION SCHEMA (Unified)
-- Combines: XP/Levels, Daily Rings, Streaks, Achievements, Mastery Paths,
--           Quests, Challenges, Cosmetics, Personal Records, Seasonal Events
-- ============================================================================
-- All tables use auth.users(id) for RLS. Requires Supabase Auth enabled.
-- Run this migration in order (respects foreign key dependencies).
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. LEVEL DEFINITIONS (reference/seed data - 12 steel-themed ranks)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.level_definitions (
  level           INTEGER PRIMARY KEY,
  title_en        TEXT NOT NULL,
  title_es        TEXT NOT NULL,
  xp_required     INTEGER NOT NULL,
  perk_description TEXT
);

INSERT INTO public.level_definitions (level, title_en, title_es, xp_required, perk_description) VALUES
  (1,  'Forge Apprentice',     'Aprendiz de Forja',          0,     'Perfil basico y onboarding quest chain'),
  (2,  'Steel Initiate',       'Iniciado del Acero',         200,   'Indicador de nivel visible en sidebar'),
  (3,  'Melt Technician',      'Tecnico de Fundicion',       500,   'Widget de progreso en dashboard'),
  (4,  'Rolling Specialist',   'Especialista de Laminacion', 1000,  'Panel de mastery paths desbloqueado'),
  (5,  'Quality Inspector',    'Inspector de Calidad',       2000,  'Color de borde de avatar personalizable'),
  (6,  'Shift Supervisor',     'Supervisor de Turno',        3500,  'Animaciones XP activadas'),
  (7,  'Production Planner',   'Planificador de Produccion', 5500,  'Badge de Veterano en perfil'),
  (8,  'Plant Engineer',       'Ingeniero de Planta',        8000,  'Dashboard completo de mastery stats'),
  (9,  'Operations Chief',     'Jefe de Operaciones',        12000, 'Tema exclusivo de perfil'),
  (10, 'Forge Commander',      'Comandante de Forja',        17000, 'Marco dorado de perfil'),
  (11, 'Steel Architect',      'Arquitecto del Acero',       24000, 'Titulo permanente + paleta de colores exclusiva'),
  (12, 'Master of the Forge',  'Maestro de la Forja',        33000, 'Marco animado de acero fundido + todos los cosmeticos');


-- ════════════════════════════════════════════════════════════════════════════
-- 2. USER PROFILES (central gamification state per user)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name            TEXT NOT NULL DEFAULT '',
  -- XP & Level
  total_xp                INTEGER NOT NULL DEFAULT 0,
  current_level           INTEGER NOT NULL DEFAULT 1,
  -- Streaks
  current_streak_days     INTEGER NOT NULL DEFAULT 0,
  longest_streak_days     INTEGER NOT NULL DEFAULT 0,
  perfect_streak_days     INTEGER NOT NULL DEFAULT 0,  -- all 3 rings closed consecutively
  streak_shields          INTEGER NOT NULL DEFAULT 0,   -- max 3, earned per 7-day streak
  last_active_date        DATE,
  -- Daily Ring Targets (user-configurable)
  ring_flow_target        INTEGER NOT NULL DEFAULT 5,          -- orders/day
  ring_tonnage_target     NUMERIC(10,2) NOT NULL DEFAULT 50.00, -- tons/day
  ring_reach_target       INTEGER NOT NULL DEFAULT 3,          -- entities/day
  -- Work Schedule
  shift_start             TIME NOT NULL DEFAULT '08:00',
  shift_end               TIME NOT NULL DEFAULT '17:00',
  work_days               INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Mon..7=Sun
  -- Cosmetic Preferences
  active_title            TEXT DEFAULT 'Aprendiz de Forja',
  active_background       TEXT NOT NULL DEFAULT 'default',
  active_sidebar_theme    TEXT NOT NULL DEFAULT 'default',
  active_accent_color     TEXT NOT NULL DEFAULT 'default',
  active_avatar_frame     TEXT NOT NULL DEFAULT 'default',
  -- Onboarding
  onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Preferences
  sound_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  timezone                TEXT NOT NULL DEFAULT 'America/Mexico_City',
  -- Aggregated counters (denormalized for fast reads)
  total_orders_created    INTEGER NOT NULL DEFAULT 0,
  total_tonnage_processed NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_clients_created   INTEGER NOT NULL DEFAULT 0,
  total_products_created  INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. XP EVENTS (immutable ledger of every XP transaction)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.xp_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,   -- 'order_created','order_completed','client_created','quest_completed','badge_earned','daily_login','streak_bonus'
  xp_amount     INTEGER NOT NULL,
  entity_type   TEXT,            -- 'order','client','product','quest','badge','system'
  entity_id     TEXT,            -- FK to the relevant record
  source        TEXT,            -- 'action','quest','badge','streak','challenge','seasonal'
  description   TEXT,            -- Human-readable: "Created order #1234"
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user_date ON public.xp_events (user_id, created_at DESC);
CREATE INDEX idx_xp_events_action ON public.xp_events (action_type);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own xp events"
  ON public.xp_events FOR SELECT USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 4. USER ACTIVITY LOG (granular event log for all tracking)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,    -- 'login','order_created','order_updated','order_completed','client_created','client_viewed',
                                --  'product_created','product_updated','product_viewed','search_used','page_visited',
                                --  'simulator_used','calculator_used','dark_mode_toggled'
  entity_type TEXT,             -- 'order','client','product','page'
  entity_id   TEXT,
  metadata    JSONB DEFAULT '{}', -- flexible: {"page":"/clientes","tons":25.5,"plant":"Monterrey","old_status":"PEN","new_status":"PROG"}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_user_time ON public.user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_log_user_action ON public.user_activity_log (user_id, action);
CREATE INDEX idx_activity_log_date ON public.user_activity_log (user_id, (created_at::date));

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity"
  ON public.user_activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity"
  ON public.user_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 5. DAILY ACTIVITY (one row per user per day - rings, streaks, heatmap)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.daily_activity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Ring Progress
  ring_flow_count       INTEGER NOT NULL DEFAULT 0,
  ring_flow_target      INTEGER NOT NULL DEFAULT 5,
  ring_tonnage_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ring_tonnage_target   NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  ring_reach_count      INTEGER NOT NULL DEFAULT 0,
  ring_reach_target     INTEGER NOT NULL DEFAULT 3,
  rings_closed          INTEGER NOT NULL DEFAULT 0,     -- 0..3
  is_triple_close       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Heatmap
  heatmap_score         INTEGER NOT NULL DEFAULT 0,     -- 0..100
  heatmap_level         SMALLINT NOT NULL DEFAULT 0,    -- 0..4
  -- Streak
  streak_maintained     BOOLEAN NOT NULL DEFAULT FALSE,
  streak_shield_used    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Detailed Counters
  orders_created        INTEGER NOT NULL DEFAULT 0,
  orders_completed      INTEGER NOT NULL DEFAULT 0,
  status_transitions    INTEGER NOT NULL DEFAULT 0,
  xp_earned             INTEGER NOT NULL DEFAULT 0,
  distinct_clients      TEXT[] DEFAULT '{}',
  distinct_products     TEXT[] DEFAULT '{}',
  distinct_plants       TEXT[] DEFAULT '{}',
  -- Session
  first_activity_at     TIMESTAMPTZ,
  last_activity_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_daily_activity_user_date ON public.daily_activity (user_id, activity_date DESC);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily activity"
  ON public.daily_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 6. STREAK HISTORY (historical record of all streaks)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.streak_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  streak_type  TEXT NOT NULL CHECK (streak_type IN ('flow', 'perfect', 'weekly')),
  started_at   DATE NOT NULL,
  ended_at     DATE,
  length_days  INTEGER NOT NULL DEFAULT 0,
  ended_reason TEXT,   -- 'broken','ongoing'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_streak_history_user ON public.streak_history (user_id, started_at DESC);

ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own streaks"
  ON public.streak_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 7. ACHIEVEMENT DEFINITIONS (master catalog - 55 badges)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.achievement_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name_es         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_es  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN (
                    'order_management','client_relations','product_knowledge',
                    'system_mastery','consistency'
                  )),
  tier            TEXT NOT NULL CHECK (tier IN ('acero','cobre','plata','oro','platino')),
  xp_value        INTEGER NOT NULL DEFAULT 10,
  icon_name       TEXT NOT NULL DEFAULT 'emoji_events',
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  criteria_type   TEXT NOT NULL,   -- 'count','cumulative','streak','time_based','composite'
  criteria_target JSONB NOT NULL,  -- {"table":"orders","action":"insert","threshold":100}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievement_defs_category ON public.achievement_definitions (category);
CREATE INDEX idx_achievement_defs_tier ON public.achievement_definitions (tier);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads achievement defs"
  ON public.achievement_definitions FOR SELECT USING (true);

-- Seed the 55 achievements
INSERT INTO public.achievement_definitions (slug, name_es, name_en, description_es, description_en, category, tier, xp_value, icon_name, is_hidden, sort_order, criteria_type, criteria_target) VALUES
  -- ORDER MANAGEMENT (14)
  ('primera_orden',         'Primera Orden',            'First Order',              'Registra tu primera orden en el sistema',                        'Register your first order',                         'order_management', 'acero',   10,  'receipt_long',           false, 1,  'count',      '{"action":"order_created","threshold":1}'),
  ('manos_a_la_obra',       'Manos a la Obra',          'Hands On',                 'Crea 10 ordenes',                                               'Create 10 orders',                                  'order_management', 'acero',   10,  'construction',           false, 2,  'count',      '{"action":"order_created","threshold":10}'),
  ('flujo_constante',       'Flujo Constante',          'Steady Flow',              'Crea 50 ordenes',                                               'Create 50 orders',                                  'order_management', 'cobre',   25,  'water_drop',             false, 3,  'count',      '{"action":"order_created","threshold":50}'),
  ('centurion_ordenes',     'Centurion de Ordenes',     'Order Centurion',          '100 ordenes procesadas',                                        '100 orders processed',                              'order_management', 'plata',   50,  'military_tech',          false, 4,  'count',      '{"action":"order_created","threshold":100}'),
  ('medio_millar',          'Medio Millar',             'Half a Thousand',          '500 ordenes',                                                   '500 orders',                                        'order_management', 'oro',     100, 'workspace_premium',      false, 5,  'count',      '{"action":"order_created","threshold":500}'),
  ('mil_de_acero',          'Mil de Acero',             'Steel Thousand',           '1000 ordenes',                                                  '1000 orders',                                       'order_management', 'platino', 250, 'diamond',                false, 6,  'count',      '{"action":"order_created","threshold":1000}'),
  ('peso_pesado',           'Peso Pesado',              'Heavy Weight',             'Procesa tu primera tonelada',                                   'Process your first ton',                            'order_management', 'acero',   10,  'scale',                  false, 7,  'cumulative', '{"field":"tonnage","threshold":1}'),
  ('cien_toneladas',        'Cien Toneladas',           'Hundred Tons',             '100 toneladas procesadas',                                      '100 tons processed',                                'order_management', 'cobre',   25,  'fitness_center',         false, 8,  'cumulative', '{"field":"tonnage","threshold":100}'),
  ('kilotonelaje',          'Kilotonelaje',             'Kilotonnage',              '1,000 toneladas',                                               '1,000 tons',                                        'order_management', 'plata',   50,  'trending_up',            false, 9,  'cumulative', '{"field":"tonnage","threshold":1000}'),
  ('megaton',               'Megaton',                  'Megaton',                  '10,000 toneladas',                                              '10,000 tons',                                       'order_management', 'oro',     100, 'rocket_launch',          false, 10, 'cumulative', '{"field":"tonnage","threshold":10000}'),
  ('cierre_rapido',         'Cierre Rapido',            'Quick Close',              'Completa una orden en menos de 24 horas',                       'Complete an order within 24 hours',                 'order_management', 'cobre',   25,  'bolt',                   false, 11, 'time_based', '{"action":"order_completed","within_hours":24}'),
  ('racha_productiva',      'Racha Productiva',         'Productive Streak',        'Completa 5 ordenes en un solo dia',                             'Complete 5 orders in one day',                      'order_management', 'plata',   50,  'local_fire_department',  false, 12, 'count',      '{"action":"order_completed","threshold":5,"period":"day"}'),
  ('turno_perfecto',        'El Turno Perfecto',        'The Perfect Shift',        'Completa 10 ordenes en un dia sin revertir ninguna',            'Complete 10 orders in a day with no reverts',       'order_management', 'oro',     100, 'verified',               true,  13, 'composite',  '{"action":"order_completed","threshold":10,"period":"day","no_reverts":true}'),
  ('fuerza_titanica',       'Fuerza Titanica',          'Titanic Force',            '100,000 toneladas procesadas',                                  '100,000 tons processed',                            'order_management', 'platino', 250, 'auto_awesome',           false, 14, 'cumulative', '{"field":"tonnage","threshold":100000}'),
  -- CLIENT RELATIONS (10)
  ('primer_contacto',       'Primer Contacto',          'First Contact',            'Registra tu primer cliente',                                    'Register your first client',                        'client_relations', 'acero',   10,  'person_add',             false, 1,  'count',      '{"action":"client_created","threshold":1}'),
  ('red_expansion',         'Red en Expansion',         'Growing Network',          'Crea 10 clientes',                                              'Create 10 clients',                                 'client_relations', 'cobre',   25,  'group_add',              false, 2,  'count',      '{"action":"client_created","threshold":10}'),
  ('rolodex_acero',         'Rolodex de Acero',         'Steel Rolodex',            '25 clientes gestionados',                                       '25 clients managed',                                'client_relations', 'plata',   50,  'contacts',               false, 3,  'count',      '{"action":"client_created","threshold":25}'),
  ('embajador_industrial',  'Embajador Industrial',     'Industrial Ambassador',    '50 clientes',                                                   '50 clients',                                        'client_relations', 'oro',     100, 'public',                 false, 4,  'count',      '{"action":"client_created","threshold":50}'),
  ('cliente_fiel',          'Cliente Fiel',             'Loyal Client',             '10 ordenes para el mismo cliente',                              '10 orders for the same client',                     'client_relations', 'cobre',   25,  'loyalty',                false, 5,  'composite',  '{"action":"orders_per_client","threshold":10}'),
  ('socio_estrategico',     'Socio Estrategico',        'Strategic Partner',        '50 ordenes para el mismo cliente',                              '50 orders for the same client',                     'client_relations', 'plata',   50,  'handshake',              false, 6,  'composite',  '{"action":"orders_per_client","threshold":50}'),
  ('multimodal',            'Multimodal',               'Multimodal',               'Trabaja con los 3 tipos de transporte',                         'Work with all 3 transport types',                   'client_relations', 'cobre',   25,  'local_shipping',         false, 7,  'composite',  '{"action":"transport_types","threshold":3}'),
  ('diversificador',        'Diversificador',           'Diversifier',              'Ordenes para 10 clientes distintos en una semana',              '10 distinct clients with orders in one week',       'client_relations', 'plata',   50,  'diversity_3',            false, 8,  'composite',  '{"action":"distinct_clients_week","threshold":10}'),
  ('nunca_falla',           'El Que Nunca Falla',       'Never Fails',              '100% CUM en 20+ ordenes de un cliente',                         '100% CUM on 20+ orders for one client',             'client_relations', 'oro',     100, 'thumb_up',               true,  9,  'composite',  '{"action":"perfect_completion_client","threshold":20}'),
  ('circulo_confianza',     'Circulo de Confianza',     'Circle of Trust',          '5 clientes con 10+ ordenes completadas cada uno',               '5 clients with 10+ completed orders each',          'client_relations', 'oro',     100, 'hub',                    false, 10, 'composite',  '{"action":"loyal_clients","threshold":5}'),
  -- PRODUCT KNOWLEDGE (10)
  ('catalogo_iniciado',     'Catalogo Iniciado',        'Catalog Started',          'Registra tu primer producto',                                   'Register your first product',                       'product_knowledge', 'acero',  10,  'inventory_2',            false, 1,  'count',      '{"action":"product_created","threshold":1}'),
  ('ingeniero_producto',    'Ingeniero de Producto',    'Product Engineer',         '10 productos registrados',                                      '10 products registered',                            'product_knowledge', 'cobre',  25,  'precision_manufacturing', false, 2,  'count',      '{"action":"product_created","threshold":10}'),
  ('maestro_calibre',       'Maestro del Calibre',      'Gauge Master',             'Trabaja con 5 calibres distintos',                              'Work with 5 distinct gauges',                       'product_knowledge', 'cobre',  25,  'straighten',             false, 3,  'composite',  '{"action":"distinct_gauges","threshold":5}'),
  ('especialista_acabados', 'Especialista en Acabados', 'Finish Specialist',        'Ordenes con 3 tipos de acabado distintos',                      'Orders with 3 distinct finish types',               'product_knowledge', 'cobre',  25,  'auto_fix_high',          false, 4,  'composite',  '{"action":"distinct_finishes","threshold":3}'),
  ('todo_proceso',          'Todo Proceso',             'All Processes',            'Ordenes con todos los tipos de proceso del sistema',            'Orders covering all process types',                 'product_knowledge', 'plata',  50,  'settings',               false, 5,  'composite',  '{"action":"all_processes","threshold":"all"}'),
  ('rango_completo',        'Rango Completo',           'Full Range',               'Productos con el grosor minimo y maximo del sistema',           'Products with thinnest and thickest in system',     'product_knowledge', 'plata',  50,  'swap_vert',              false, 6,  'composite',  '{"action":"thickness_range","threshold":"full"}'),
  ('empaquetador_experto',  'Empaquetador Experto',     'Packing Expert',           'Trabaja con 5 codigos de empaque distintos',                    'Work with 5 distinct packaging codes',              'product_knowledge', 'cobre',  25,  'package_2',              false, 7,  'composite',  '{"action":"distinct_packaging","threshold":5}'),
  ('conocedor_grados',      'Conocedor de Grados',      'Grade Connoisseur',        '10 grade_pn distintos',                                         '10 distinct grade_pn values',                       'product_knowledge', 'plata',  50,  'science',                false, 8,  'composite',  '{"action":"distinct_grades","threshold":10}'),
  ('enciclopedia_acero',    'Enciclopedia de Acero',    'Steel Encyclopedia',       '50 productos con especificaciones completas',                   '50 products with full specs',                       'product_knowledge', 'oro',    100, 'auto_stories',           false, 9,  'composite',  '{"action":"full_spec_products","threshold":50}'),
  ('el_metalurgista',       'El Metalurgista',          'The Metallurgist',         'Ordenes cubriendo todos los grados del sistema',                'Orders covering all grade_pn values',               'product_knowledge', 'platino', 250, 'science',               true,  10, 'composite',  '{"action":"all_grades","threshold":"all"}'),
  -- SYSTEM MASTERY (11)
  ('primer_login',          'Primer Login',             'First Login',              'Bienvenido a SteelFlow Pro',                                    'Welcome to SteelFlow Pro',                          'system_mastery',   'acero',  10,  'login',                  false, 1,  'count',      '{"action":"login","threshold":1}'),
  ('exploracion_completa',  'Exploracion Completa',     'Full Exploration',         'Visita todas las secciones de SteelFlow',                       'Visit all SteelFlow sections',                      'system_mastery',   'acero',  10,  'explore',                false, 2,  'composite',  '{"action":"visit_all_pages","threshold":5}'),
  ('busqueda_precisa',      'Busqueda Precisa',         'Precise Search',           'Usa la busqueda 10 veces',                                      'Use search 10 times',                               'system_mastery',   'acero',  10,  'search',                 false, 3,  'count',      '{"action":"search_used","threshold":10}'),
  ('simulador_activado',    'Simulador Activado',       'Simulator Activated',      'Lanza el simulador 3D por primera vez',                         'Launch the 3D simulator',                           'system_mastery',   'acero',  10,  'view_in_ar',             false, 4,  'count',      '{"action":"simulator_used","threshold":1}'),
  ('operador_nocturno',     'Operador Nocturno',        'Night Operator',           'Usa el sistema entre 10 PM y 6 AM',                             'Use the system between 10 PM and 6 AM',             'system_mastery',   'cobre',  25,  'dark_mode',              true,  5,  'time_based', '{"action":"night_activity","start_hour":22,"end_hour":6}'),
  ('madrugador',            'Madrugador Industrial',    'Early Bird',               'Usa el sistema antes de las 6 AM',                              'Use the system before 6 AM',                        'system_mastery',   'cobre',  25,  'wb_twilight',            true,  6,  'time_based', '{"action":"early_activity","before_hour":6}'),
  ('semana_completa',       'Semana Completa',          'Full Week',                'Inicia sesion todos los dias de la semana',                     'Log in every day of the week',                      'system_mastery',   'plata',  50,  'date_range',             false, 7,  'streak',     '{"action":"login_streak","threshold":7}'),
  ('mes_de_acero',          'Mes de Acero',             'Steel Month',              'Inicia sesion todos los dias laborales del mes',                'Log in every workday for a month',                  'system_mastery',   'oro',    100, 'calendar_month',         false, 8,  'streak',     '{"action":"workday_logins","threshold":20}'),
  ('racha_30',              'Racha de 30',              'Streak of 30',             'Mantiene racha de 30 dias',                                     'Maintain 30-day streak',                            'system_mastery',   'oro',    100, 'local_fire_department',  false, 9,  'streak',     '{"action":"login_streak","threshold":30}'),
  ('racha_100',             'Racha de 100',             'Streak of 100',            '100 dias sin fallar',                                           '100 consecutive days',                              'system_mastery',   'platino', 250, 'whatshot',              false, 10, 'streak',     '{"action":"login_streak","threshold":100}'),
  ('modo_oscuro',           'Modo Oscuro',              'Dark Mode',                'Activa el modo oscuro por primera vez',                         'Toggle dark mode for first time',                   'system_mastery',   'acero',  10,  'dark_mode',              true,  11, 'count',      '{"action":"dark_mode_toggled","threshold":1}'),
  -- CONSISTENCY (10)
  ('primer_semana',         'Primera Semana',           'First Week',               'Completa tu primera semana usando SteelFlow',                   'Complete your first week',                          'consistency',      'acero',  10,  'event_available',        false, 1,  'time_based', '{"action":"days_since_signup","threshold":7,"min_active":3}'),
  ('primer_mes',            'Primer Mes',               'First Month',              'Un mes de operaciones industriales',                            'One month of operations',                           'consistency',      'cobre',  25,  'calendar_today',         false, 2,  'time_based', '{"action":"days_since_signup","threshold":30,"min_active":10}'),
  ('veterano_trimestral',   'Veterano Trimestral',      'Quarterly Veteran',        'Tres meses de uso consistente',                                 'Three months of consistent use',                    'consistency',      'plata',  50,  'military_tech',          false, 3,  'time_based', '{"action":"days_since_signup","threshold":90,"min_active":30}'),
  ('aniversario_acero',     'Aniversario de Acero',     'Steel Anniversary',        'Un anio completo con SteelFlow Pro',                            'One full year with SteelFlow Pro',                  'consistency',      'oro',    100, 'cake',                   false, 4,  'time_based', '{"action":"days_since_signup","threshold":365}'),
  ('mejor_semana',          'Mejor Semana Personal',    'Personal Best Week',       'Supera tu record de ordenes en una semana',                     'Beat your weekly order record',                     'consistency',      'plata',  50,  'trending_up',            false, 5,  'composite',  '{"action":"beat_weekly_record"}'),
  ('mejor_mes',             'Mejor Mes Personal',       'Personal Best Month',      'Supera tu record de tonelaje mensual',                          'Beat your monthly tonnage record',                  'consistency',      'oro',    100, 'moving',                 false, 6,  'composite',  '{"action":"beat_monthly_record"}'),
  ('sin_pausa',             'Sin Pausa',                'Non-Stop',                 'Crea al menos una orden cada dia laboral por 2 semanas',        'At least 1 order every workday for 2 weeks',        'consistency',      'plata',  50,  'speed',                  false, 7,  'streak',     '{"action":"order_workday_streak","threshold":10}'),
  ('multi_planta',          'Multi-Planta',             'Multi-Plant',              'Ordenes de 3 plantas distintas en un dia',                      '3 distinct plants in one day',                      'consistency',      'cobre',  25,  'domain',                 false, 8,  'composite',  '{"action":"distinct_plants_day","threshold":3}'),
  ('el_incansable',         'El Incansable',            'The Tireless',             'Procesa 50+ toneladas en un solo dia',                          'Process 50+ tons in one day',                       'consistency',      'oro',    100, 'fitness_center',         true,  9,  'cumulative', '{"field":"daily_tonnage","threshold":50}'),
  ('leyenda_acero',         'Leyenda del Acero',        'Steel Legend',             'Desbloquea 50 logros',                                          'Unlock 50 achievements',                            'consistency',      'platino', 250, 'stars',                 false, 10, 'count',      '{"action":"achievements_unlocked","threshold":50}');


-- ════════════════════════════════════════════════════════════════════════════
-- 8. USER ACHIEVEMENTS (earned badges per user)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,  -- pinned to showcase, max 5
  notified        BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements (user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own achievements"
  ON public.user_achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 9. USER ACHIEVEMENT PROGRESS (incremental progress toward badges)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_achievement_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  current_value   NUMERIC NOT NULL DEFAULT 0,
  target_value    NUMERIC NOT NULL,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievement_progress_user ON public.user_achievement_progress (user_id);

ALTER TABLE public.user_achievement_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress"
  ON public.user_achievement_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 10. MASTERY PATHS (3 skill trees with 5 tiers each)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.mastery_paths (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  path_key        TEXT NOT NULL CHECK (path_key IN ('order_flow', 'client_relations', 'product_specialist')),
  current_tier    INTEGER NOT NULL DEFAULT 1,
  domain_xp       INTEGER NOT NULL DEFAULT 0,
  tier_unlocked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_key)
);

ALTER TABLE public.mastery_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mastery"
  ON public.mastery_paths FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 11. QUEST DEFINITIONS (onboarding + weekly + monthly + seasonal quests)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.quest_definitions (
  id                    TEXT PRIMARY KEY,
  quest_type            TEXT NOT NULL CHECK (quest_type IN ('onboarding', 'weekly', 'monthly', 'seasonal')),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  narrative_text        TEXT,
  icon                  TEXT NOT NULL DEFAULT 'task_alt',
  xp_reward             INTEGER NOT NULL DEFAULT 0,
  target_count          INTEGER NOT NULL DEFAULT 1,
  target_action         TEXT NOT NULL,
  target_metadata       JSONB DEFAULT '{}',
  chain_id              TEXT,
  chain_order           INTEGER DEFAULT 0,
  cosmetic_reward_type  TEXT,
  cosmetic_reward_value TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  season                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quest_defs_type ON public.quest_definitions (quest_type);
CREATE INDEX idx_quest_defs_chain ON public.quest_definitions (chain_id);

ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads quest defs"
  ON public.quest_definitions FOR SELECT USING (true);

-- Seed onboarding quests
INSERT INTO public.quest_definitions (id, quest_type, title, description, narrative_text, icon, xp_reward, target_count, target_action, chain_id, chain_order) VALUES
  ('onb_first_spark',    'onboarding', 'First Spark',       'Visita el Dashboard por primera vez',                     'Tu primer dia. El horno zumba. Es hora de aprender.',   'bolt',            10,  1, 'visit_dashboard',  'onboarding_chain', 1),
  ('onb_know_forge',     'onboarding', 'Know Your Forge',   'Revisa las 4 tarjetas KPI del Dashboard',                 'Conoce los numeros que mueven la planta.',              'analytics',       20,  4, 'view_kpi',         'onboarding_chain', 2),
  ('onb_first_contact',  'onboarding', 'First Contact',     'Navega a la pagina de Clientes',                          'Nuevas caras en la puerta. Recibelas.',                 'groups',          15,  1, 'visit_clients',    'onboarding_chain', 3),
  ('onb_the_ledger',     'onboarding', 'The Ledger Opens',  'Agrega tu primer cliente',                                'El registro se abre. Escribe el primer nombre.',       'person_add',      50,  1, 'create_client',    'onboarding_chain', 4),
  ('onb_iron_catalogue', 'onboarding', 'Iron Catalogue',    'Navega a la pagina de Productos',                         'Los ingenieros necesitan nuevas especificaciones.',    'inventory_2',     15,  1, 'visit_products',   'onboarding_chain', 5),
  ('onb_first_blueprint','onboarding', 'First Blueprint',   'Crea tu primer producto',                                 'Cada producto tiene una historia. Escribe la primera.','precision_manufacturing', 50, 1, 'create_product', 'onboarding_chain', 6),
  ('onb_furnace_ignites','onboarding', 'The Furnace Ignites','Navega a la pagina de Ordenes',                           'El horno se enciende. Las ordenes fluyen.',            'receipt_long',    15,  1, 'visit_orders',     'onboarding_chain', 7),
  ('onb_first_pour',     'onboarding', 'First Pour',        'Crea tu primera orden',                                   'La primera colada. El acero toma forma.',              'local_fire_department', 75, 1, 'create_order', 'onboarding_chain', 8),
  ('onb_the_crucible',   'onboarding', 'The Crucible',      'Usa el Simulador 3D',                                     'Domina lo virtual antes de comandar lo real.',         'view_in_ar',      30,  1, 'visit_simulator',  'onboarding_chain', 9),
  ('onb_weight_watcher', 'onboarding', 'Weight Watcher',    'Usa la Calculadora de Empaquetado',                       'La eficiencia nace de la medicion.',                   'calculate',       25,  1, 'use_calculator',   'onboarding_chain', 10),
  ('onb_flow_reader',    'onboarding', 'Flow Reader',       'Revisa los graficos de Flujo Diario y Distribucion',      'Los patrones cuentan historias.',                      'bar_chart',       30,  2, 'view_charts',      'onboarding_chain', 11),
  ('onb_forged_steel',   'onboarding', 'Forged in Steel',   'Completa todas las misiones de onboarding',               'Forjado en acero. El camino apenas comienza.',         'emoji_events',    100, 11,'complete_onboarding','onboarding_chain', 12);

-- Seed weekly quests
INSERT INTO public.quest_definitions (id, quest_type, title, description, narrative_text, icon, xp_reward, target_count, target_action) VALUES
  ('weekly_furnace_calls',   'weekly',  'The Furnace Calls',   'Procesa 10 ordenes esta semana',                    'La linea de produccion tiene hambre. Alimentala.', 'local_fire_department', 80,  10, 'create_order'),
  ('weekly_client_wrangler', 'weekly',  'Client Wrangler',     'Agrega 3 nuevos clientes',                          'Nuevas caras en la puerta. Recibelas.',            'person_add',            60,  3,  'create_client'),
  ('weekly_product_architect','weekly', 'Product Architect',   'Crea 5 productos',                                  'Los ingenieros necesitan nuevas specs.',            'precision_manufacturing',70, 5,  'create_product'),
  ('weekly_shift_logger',    'weekly',  'Shift Logger',        'Inicia sesion 5 dias distintos esta semana',         'Cada visita cuenta. Demuestra tu dedicacion.',     'calendar_today',        50,  5,  'daily_login'),
  ('weekly_heavy_hauler',    'weekly',  'Heavy Hauler',        'Procesa ordenes por 50+ toneladas esta semana',      'El tonelaje es rey. Mueve montanas de acero.',     'fitness_center',        90,  50, 'tonnage_logged'),
  ('weekly_express_lane',    'weekly',  'Express Lane',        'Crea 3 ordenes en una sola sesion',                  'La velocidad es acero.',                           'bolt',                  65,  3,  'orders_in_session'),
  ('weekly_cross_plant',     'weekly',  'Cross-Plant Runner',  'Procesa ordenes para 3 plantas distintas',           'El acero no conoce fronteras.',                    'domain',                75,  3,  'distinct_plants'),
  ('weekly_inspector',       'weekly',  'The Inspector',       'Revisa 15 detalles de ordenes individuales',         'Cada detalle importa en la forja.',                'search',                55,  15, 'view_order_detail'),
  ('weekly_dawn_shift',      'weekly',  'Dawn Shift',          'Inicia sesion antes de las 8 AM en 3 dias',          'Primera luz, primer login.',                       'wb_sunny',              60,  3,  'early_login'),
  ('weekly_endurance',       'weekly',  'Endurance Run',       'Sesion activa de 2+ horas en un dia',               'La forja nunca duerme.',                           'timer',                 50,  1,  'long_session');

-- Seed monthly quests
INSERT INTO public.quest_definitions (id, quest_type, title, description, narrative_text, icon, xp_reward, target_count, target_action) VALUES
  ('monthly_iron_harvest',    'monthly', 'The Iron Harvest',     'Procesa 50 ordenes este mes',                       'Un mes de labor, una montana de acero.',             'agriculture',           200, 50,  'create_order'),
  ('monthly_empire_builder',  'monthly', 'Empire Builder',       'Agrega 10 clientes este mes',                       'Tu lista crece. Los imperios se construyen.',        'account_balance',       150, 10,  'create_client'),
  ('monthly_full_catalogue',  'monthly', 'The Full Catalogue',   'Crea 20 productos este mes',                        'Cada producto tiene su historia.',                   'library_books',         175, 20,  'create_product'),
  ('monthly_streak_steel',    'monthly', 'Streak of Steel',      'Inicia sesion 20 dias este mes',                    'La consistencia forja la aleacion mas fuerte.',      'local_fire_department', 250, 20,  'daily_login'),
  ('monthly_centurion',       'monthly', 'The Centurion',        'Procesa 100 ordenes este mes',                      'Cien coladas. Cien victorias.',                      'military_tech',         400, 100, 'create_order'),
  ('monthly_weight_champion', 'monthly', 'Weight Champion',      'Procesa 500+ toneladas este mes',                   'El tonelaje define imperios.',                       'fitness_center',        300, 500, 'tonnage_logged'),
  ('monthly_explorer',        'monthly', 'Explorer''s Log',      'Visita las 5 paginas principales 3+ veces cada una','Conoce cada rincon de tu forja.',                    'explore',               120, 15,  'page_visits'),
  ('monthly_order_closer',    'monthly', 'Order Closer',         '15 ordenes llegan a estatus CUM este mes',          'Lleva cada trabajo hasta el final.',                 'check_circle',          225, 15,  'order_completed'),
  ('monthly_sim_veteran',     'monthly', 'Simulator Veteran',    '30 minutos acumulados en el Simulador',             'Domina lo virtual.',                                 'view_in_ar',            150, 30,  'simulator_minutes'),
  ('monthly_perfectionist',   'monthly', 'The Perfectionist',    'Cierra el mes con cero ordenes PEN',                'Ni una sola orden queda atras.',                     'verified',              350, 1,   'zero_pending');


-- ════════════════════════════════════════════════════════════════════════════
-- 12. USER QUESTS (active/completed quests per user)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_quests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  quest_id         TEXT NOT NULL REFERENCES public.quest_definitions(id),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'locked')),
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_count     INTEGER NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  xp_awarded       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

CREATE INDEX idx_user_quests_active ON public.user_quests (user_id, status);
CREATE INDEX idx_user_quests_expires ON public.user_quests (expires_at) WHERE status = 'active';

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quests"
  ON public.user_quests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 13. CHALLENGE DEFINITIONS (daily/weekly/monthly challenges)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.challenge_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  duration        TEXT NOT NULL CHECK (duration IN ('daily', 'weekly', 'monthly')),
  xp_reward       INTEGER NOT NULL DEFAULT 50,
  condition_type  TEXT NOT NULL,
  condition_threshold INTEGER NOT NULL,
  condition_extra JSONB DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads challenge defs"
  ON public.challenge_definitions FOR SELECT USING (true);

-- Seed challenges (abbreviated - 15 daily, 10 weekly, 10 monthly)
INSERT INTO public.challenge_definitions (slug, name, description, tier, duration, xp_reward, condition_type, condition_threshold) VALUES
  ('primer_flujo',       'Primer Flujo',        'Procesa tu primera orden del dia',               'bronze', 'daily',   50,  'orders_processed', 1),
  ('cinco_al_dia',       'Cinco al Dia',        'Procesa 5 ordenes hoy',                          'bronze', 'daily',   75,  'orders_processed', 5),
  ('turno_completo',     'Turno Completo',      'Procesa 10 ordenes en un solo dia',              'bronze', 'daily',   100, 'orders_processed', 10),
  ('actualizador',       'Actualizador',        'Actualiza el estatus de 3 ordenes',              'bronze', 'daily',   60,  'status_changes',   3),
  ('cerrador',           'Cerrador',            'Mueve 3 ordenes a estatus CUM',                  'bronze', 'daily',   75,  'orders_completed', 3),
  ('contacto_directo',   'Contacto Directo',    'Accede a 3 registros de clientes distintos',     'bronze', 'daily',   50,  'clients_accessed', 3),
  ('inspector_producto', 'Inspector de Producto','Accede a 3 registros de productos distintos',    'bronze', 'daily',   50,  'products_accessed',3),
  ('tonelaje_dia',       'Tonelaje del Dia',    'Registra 25+ toneladas hoy',                     'bronze', 'daily',   75,  'daily_tonnage',    25),
  ('triple_cierre',      'Triple Cierre',       'Cierra los 3 anillos diarios',                   'bronze', 'daily',   100, 'rings_closed',     3),
  ('madrugador_d',       'Madrugador',          'Cierra un anillo antes de las 10 AM',            'bronze', 'daily',   75,  'ring_before_10am', 1),
  ('semana_acero',       'Semana de Acero',     'Cierra al menos 1 anillo cada dia laboral',      'silver', 'weekly',  300, 'ring_days',        5),
  ('semana_perfecta',    'Semana Perfecta',     'Cierra los 3 anillos cada dia laboral',          'silver', 'weekly',  500, 'triple_close_days',5),
  ('flujo_semanal_25',   'Flujo Semanal 25',    'Procesa 25 ordenes esta semana',                 'silver', 'weekly',  250, 'orders_processed', 25),
  ('tonelaje_semanal',   'Tonelaje Semanal',    'Registra 250+ toneladas esta semana',            'silver', 'weekly',  300, 'weekly_tonnage',   250),
  ('cartera_completa',   'Cartera Completa',    'Toca 10+ clientes distintos esta semana',        'silver', 'weekly',  200, 'distinct_clients', 10),
  ('maestro_flujo',      'Maestro del Flujo',   'Procesa 100 ordenes este mes',                   'gold',   'monthly', 1000,'orders_processed', 100),
  ('titan_tonelaje',     'Titan del Tonelaje',  'Registra 1000+ toneladas este mes',              'gold',   'monthly', 1500,'monthly_tonnage',  1000),
  ('racha_30_ch',        'Racha de 30',         'Mantiene racha de 30 dias',                      'gold',   'monthly', 2500,'streak_days',      30),
  ('perfeccionista_mes', 'Perfeccionista Mensual','Triple Cierre en 15+ dias este mes',           'gold',   'monthly', 2000,'triple_close_days',15),
  ('mapa_completo',      'Mapa Completo',       'Actividad en 20+ dias este mes',                 'gold',   'monthly', 1500,'active_days',      20);


-- ════════════════════════════════════════════════════════════════════════════
-- 14. USER CHALLENGES (assigned challenges per user per period)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  challenge_id     UUID NOT NULL REFERENCES public.challenge_definitions(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at     TIMESTAMPTZ,
  xp_awarded       INTEGER NOT NULL DEFAULT 0,
  rerolled         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_challenges_active ON public.user_challenges (user_id, period_end DESC, is_completed);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own challenges"
  ON public.user_challenges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 15. USER COSMETICS (unlocked themes, frames, backgrounds)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_cosmetics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cosmetic_type   TEXT NOT NULL CHECK (cosmetic_type IN ('background', 'sidebar_theme', 'accent_color', 'avatar_frame', 'title')),
  cosmetic_value  TEXT NOT NULL,
  unlocked_via    TEXT,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cosmetic_type, cosmetic_value)
);

CREATE INDEX idx_user_cosmetics_user ON public.user_cosmetics (user_id);

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cosmetics"
  ON public.user_cosmetics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 16. USER PERSONAL RECORDS (personal bests)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.user_personal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL CHECK (record_type IN (
                    'best_day_orders','best_day_tonnage','best_week_orders','best_week_tonnage',
                    'best_month_orders','best_month_tonnage','fastest_completion_seconds',
                    'longest_streak','most_clients_day','heaviest_single_order','most_plants_day'
                  )),
  record_value    NUMERIC NOT NULL,
  record_date     DATE NOT NULL,
  record_detail   TEXT,
  previous_value  NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, record_type)
);

CREATE INDEX idx_personal_records_user ON public.user_personal_records (user_id);

ALTER TABLE public.user_personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own records"
  ON public.user_personal_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 17. SEASONAL EVENTS (quarterly themed events)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.seasonal_events (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  narrative_text  TEXT,
  theme_key       TEXT NOT NULL,
  xp_multiplier   NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads seasonal events"
  ON public.seasonal_events FOR SELECT USING (true);


-- ════════════════════════════════════════════════════════════════════════════
-- 18. WEEKLY RECAPS (generated weekly summaries)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.weekly_recaps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  week_end              DATE NOT NULL,
  total_orders          INTEGER NOT NULL DEFAULT 0,
  total_tonnage         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_clients_touched INTEGER NOT NULL DEFAULT 0,
  total_products_touched INTEGER NOT NULL DEFAULT 0,
  days_with_activity    INTEGER NOT NULL DEFAULT 0,
  rings_closed_total    INTEGER NOT NULL DEFAULT 0,
  triple_close_days     INTEGER NOT NULL DEFAULT 0,
  challenges_completed  INTEGER NOT NULL DEFAULT 0,
  xp_earned             INTEGER NOT NULL DEFAULT 0,
  streak_at_week_end    INTEGER NOT NULL DEFAULT 0,
  orders_vs_prev_week   NUMERIC(5,2),
  tonnage_vs_prev_week  NUMERIC(5,2),
  personal_bests        JSONB DEFAULT '[]',
  is_read               BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recaps"
  ON public.weekly_recaps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- HELPER: Function to auto-create user profile on signup
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''));

  -- Initialize mastery paths
  INSERT INTO public.mastery_paths (user_id, path_key) VALUES
    (NEW.id, 'order_flow'),
    (NEW.id, 'client_relations'),
    (NEW.id, 'product_specialist');

  -- Assign onboarding quests
  INSERT INTO public.user_quests (user_id, quest_id, target_count)
  SELECT NEW.id, id, target_count
  FROM public.quest_definitions
  WHERE quest_type = 'onboarding' AND is_active = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ════════════════════════════════════════════════════════════════════════════
-- Done. 18 tables + seed data + trigger.
-- ════════════════════════════════════════════════════════════════════════════
