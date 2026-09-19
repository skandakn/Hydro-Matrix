-- ============================================================
-- HYDRO MATRIX: Supabase Database Schema
-- Guwahati Bahini/Bharalu Basin Crisis Command Platform
-- Run this in the Supabase SQL editor to set up all tables.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. user_profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id    text UNIQUE NOT NULL,
  display_name     text,
  organization     text,
  role             text NOT NULL DEFAULT 'operator'
                   CHECK (role IN ('operator', 'supervisor', 'admin')),
  preferred_scenario_id text,
  notification_phone    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. simulation_sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.simulation_sessions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    text,                  -- Clerk user ID (nullable for unauthenticated)
  scenario_id                text NOT NULL,
  scenario_name              text NOT NULL,
  started_at                 timestamptz NOT NULL DEFAULT now(),
  ended_at                   timestamptz,
  total_ticks                integer NOT NULL DEFAULT 0,
  elapsed_seconds            integer NOT NULL DEFAULT 0,

  -- Peak KPIs
  peak_flooded_area_sqkm     numeric(8,4) NOT NULL DEFAULT 0,
  peak_affected_population   integer NOT NULL DEFAULT 0,
  peak_water_depth           numeric(6,3) NOT NULL DEFAULT 0,
  peak_critical_zone_count   integer NOT NULL DEFAULT 0,
  total_drained_volume_m3    numeric(12,2) NOT NULL DEFAULT 0,

  -- Configuration at session start
  rainfall_intensity_mmhr    numeric(6,1) NOT NULL,
  drainage_efficiency        numeric(4,3) NOT NULL,
  brahmaputra_stage_m        numeric(6,2) NOT NULL,
  sluice_gate_open           boolean NOT NULL DEFAULT true,
  active_pump_count          integer NOT NULL DEFAULT 20,

  -- JSONB fields
  disasters_injected         jsonb NOT NULL DEFAULT '[]',
  map_settings               jsonb,

  created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON public.simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scenario  ON public.simulation_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started   ON public.simulation_sessions(started_at DESC);

-- ─── 3. telemetry_history ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telemetry_history (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                uuid NOT NULL REFERENCES public.simulation_sessions(id) ON DELETE CASCADE,
  tick                      integer NOT NULL,
  elapsed_minutes           numeric(8,2) NOT NULL,
  time_label                text NOT NULL,
  flooded_area_sqkm         numeric(8,4) NOT NULL,
  affected_population       integer NOT NULL,
  critical_zones            integer NOT NULL,
  warning_zones             integer NOT NULL,
  max_water_depth           numeric(6,3) NOT NULL,
  avg_drainage_efficiency   numeric(5,1) NOT NULL,
  bahini_bharalu_flow_m3s   numeric(8,2),
  active_pumps_count        integer,
  recorded_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_session  ON public.telemetry_history(session_id, tick);

-- ─── 4. pump_events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pump_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.simulation_sessions(id) ON DELETE CASCADE,
  tick         integer NOT NULL,
  pump_id      text NOT NULL,
  pump_name    text NOT NULL,
  event_type   text NOT NULL CHECK (event_type IN ('ARMED', 'OFFLINE', 'FAILED', 'RESTORED')),
  triggered_by text NOT NULL CHECK (triggered_by IN ('user_toggle', 'disaster_injection', 'scenario_load')),
  user_id      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pump_events_session ON public.pump_events(session_id);

-- ─── 5. sitrep_reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sitrep_reports (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                 uuid REFERENCES public.simulation_sessions(id) ON DELETE SET NULL,
  user_id                    text,
  generated_at               timestamptz NOT NULL DEFAULT now(),
  elapsed_seconds            integer NOT NULL,
  tick                       integer NOT NULL,
  flooded_area_sqkm          numeric(8,4) NOT NULL,
  affected_population        integer NOT NULL,
  critical_zone_count        integer NOT NULL,
  max_water_depth            numeric(6,3) NOT NULL,
  rainfall_intensity_mmhr    numeric(6,1) NOT NULL,
  active_pumps_count         integer NOT NULL,
  bahini_bharalu_flow_m3s    numeric(8,2) NOT NULL,
  sluice_gate_open           boolean NOT NULL,
  brahmaputra_stage_m        numeric(6,2) NOT NULL,
  scenario_id                text NOT NULL,
  scenario_name              text NOT NULL,
  compromised_infrastructure jsonb NOT NULL DEFAULT '[]',
  active_disasters           jsonb NOT NULL DEFAULT '[]',
  created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sitrep_user      ON public.sitrep_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sitrep_session   ON public.sitrep_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_sitrep_generated ON public.sitrep_reports(generated_at DESC);

-- ─── 6. comparison_benchmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comparison_benchmarks (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at                     timestamptz NOT NULL DEFAULT now(),
  scenario_id                     text NOT NULL,
  scenario_name                   text NOT NULL,
  peak_flooded_area_sqkm          numeric(8,4) NOT NULL,
  peak_affected_population        integer NOT NULL,
  peak_water_depth                numeric(6,3) NOT NULL,
  time_to_first_critical_min      integer,
  infrastructure_compromised_count integer NOT NULL DEFAULT 0,
  data_points                     jsonb NOT NULL DEFAULT '[]',
  config_hash                     text NOT NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, config_hash)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_scenario ON public.comparison_benchmarks(scenario_id);

-- ─── 7. emergency_calls ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emergency_calls (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                 text UNIQUE NOT NULL,
  caller_id               text NOT NULL,
  mode                    text NOT NULL CHECK (mode IN ('browser', 'phone')),
  status                  text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('initiating', 'active', 'completed', 'failed')),
  start_time              timestamptz NOT NULL DEFAULT now(),
  end_time                timestamptz,
  duration_seconds        integer,
  exotel_call_id          text,
  summary                 text,
  transcript              jsonb NOT NULL DEFAULT '[]',
  extracted_location      text,
  extracted_water_level_m numeric(5,2),
  urgency_level           text CHECK (urgency_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  needs_evacuation        boolean NOT NULL DEFAULT false,
  caller_name             text,
  notes                   text,
  simulation_session_id   uuid REFERENCES public.simulation_sessions(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_start_time ON public.emergency_calls(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_calls_urgency    ON public.emergency_calls(urgency_level);
CREATE INDEX IF NOT EXISTS idx_calls_status     ON public.emergency_calls(status);

-- ─── 8. cell_interventions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cell_interventions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES public.simulation_sessions(id) ON DELETE CASCADE,
  user_id              text,
  cell_id              text NOT NULL,
  cell_name            text NOT NULL,
  action_type          text NOT NULL
                       CHECK (action_type IN (
                         'BARRIER_DEPLOYED', 'BARRIER_REMOVED',
                         'DRAIN_BLOCKED', 'DRAIN_UNBLOCKED',
                         'EVACUATION_ORDERED', 'EVACUATION_CANCELLED'
                       )),
  tick_applied         integer NOT NULL,
  water_level_at_action numeric(6,3) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_session ON public.cell_interventions(session_id);
CREATE INDEX IF NOT EXISTS idx_interventions_cell    ON public.cell_interventions(cell_id);

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
-- Allow all reads/writes via service role; anon reads own data only.

ALTER TABLE public.simulation_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitrep_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_benchmarks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_calls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_interventions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS (used by server-side API routes)
-- Public read on comparison_benchmarks (static precomputed data)
CREATE POLICY "Public read benchmarks"
  ON public.comparison_benchmarks FOR SELECT
  USING (true);

-- Public read on sitrep_reports (crisis transparency)
CREATE POLICY "Public read sitrep"
  ON public.sitrep_reports FOR SELECT
  USING (true);

-- Public read on emergency_calls
CREATE POLICY "Public read emergency calls"
  ON public.emergency_calls FOR SELECT
  USING (true);

-- Public read on simulation_sessions
CREATE POLICY "Public read sessions"
  ON public.simulation_sessions FOR SELECT
  USING (true);

-- Public read on telemetry
CREATE POLICY "Public read telemetry"
  ON public.telemetry_history FOR SELECT
  USING (true);
