/**
 * HYDRO MATRIX: Supabase Database Types
 * Auto-generated-style typed schema for all Supabase tables.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      simulation_sessions: {
        Row: SimulationSessionRow;
        Insert: SimulationSessionInsert;
        Update: Partial<SimulationSessionInsert>;
      };
      telemetry_history: {
        Row: TelemetryHistoryRow;
        Insert: TelemetryHistoryInsert;
        Update: Partial<TelemetryHistoryInsert>;
      };
      pump_events: {
        Row: PumpEventRow;
        Insert: PumpEventInsert;
        Update: Partial<PumpEventInsert>;
      };
      sitrep_reports: {
        Row: SitRepReportRow;
        Insert: SitRepReportInsert;
        Update: Partial<SitRepReportInsert>;
      };
      comparison_benchmarks: {
        Row: ComparisonBenchmarkRow;
        Insert: ComparisonBenchmarkInsert;
        Update: Partial<ComparisonBenchmarkInsert>;
      };
      emergency_calls: {
        Row: EmergencyCallRow;
        Insert: EmergencyCallInsert;
        Update: Partial<EmergencyCallInsert>;
      };
      cell_interventions: {
        Row: CellInterventionRow;
        Insert: CellInterventionInsert;
        Update: Partial<CellInterventionInsert>;
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
      };
    };
  };
}

// ─── simulation_sessions ─────────────────────────────────────────────────────

export interface SimulationSessionRow {
  id: string;
  user_id: string | null;
  scenario_id: string;
  scenario_name: string;
  started_at: string;
  ended_at: string | null;
  total_ticks: number;
  elapsed_seconds: number;
  peak_flooded_area_sqkm: number;
  peak_affected_population: number;
  peak_water_depth: number;
  peak_critical_zone_count: number;
  total_drained_volume_m3: number;
  rainfall_intensity_mmhr: number;
  drainage_efficiency: number;
  brahmaputra_stage_m: number;
  sluice_gate_open: boolean;
  active_pump_count: number;
  disasters_injected: Json;
  map_settings: Json | null;
  created_at: string;
}

export interface SimulationSessionInsert {
  id?: string;
  user_id?: string | null;
  scenario_id: string;
  scenario_name: string;
  started_at?: string;
  ended_at?: string | null;
  total_ticks?: number;
  elapsed_seconds?: number;
  peak_flooded_area_sqkm?: number;
  peak_affected_population?: number;
  peak_water_depth?: number;
  peak_critical_zone_count?: number;
  total_drained_volume_m3?: number;
  rainfall_intensity_mmhr: number;
  drainage_efficiency: number;
  brahmaputra_stage_m: number;
  sluice_gate_open: boolean;
  active_pump_count: number;
  disasters_injected?: Json;
  map_settings?: Json | null;
}

// ─── telemetry_history ───────────────────────────────────────────────────────

export interface TelemetryHistoryRow {
  id: string;
  session_id: string;
  tick: number;
  elapsed_minutes: number;
  time_label: string;
  flooded_area_sqkm: number;
  affected_population: number;
  critical_zones: number;
  warning_zones: number;
  max_water_depth: number;
  avg_drainage_efficiency: number;
  bahini_bharalu_flow_m3s: number | null;
  active_pumps_count: number | null;
  recorded_at: string;
}

export interface TelemetryHistoryInsert {
  id?: string;
  session_id: string;
  tick: number;
  elapsed_minutes: number;
  time_label: string;
  flooded_area_sqkm: number;
  affected_population: number;
  critical_zones: number;
  warning_zones: number;
  max_water_depth: number;
  avg_drainage_efficiency: number;
  bahini_bharalu_flow_m3s?: number | null;
  active_pumps_count?: number | null;
  recorded_at?: string;
}

// ─── pump_events ─────────────────────────────────────────────────────────────

export interface PumpEventRow {
  id: string;
  session_id: string;
  tick: number;
  pump_id: string;
  pump_name: string;
  event_type: 'ARMED' | 'OFFLINE' | 'FAILED' | 'RESTORED';
  triggered_by: 'user_toggle' | 'disaster_injection' | 'scenario_load';
  user_id: string | null;
  created_at: string;
}

export interface PumpEventInsert {
  id?: string;
  session_id: string;
  tick: number;
  pump_id: string;
  pump_name: string;
  event_type: 'ARMED' | 'OFFLINE' | 'FAILED' | 'RESTORED';
  triggered_by: 'user_toggle' | 'disaster_injection' | 'scenario_load';
  user_id?: string | null;
}

// ─── sitrep_reports ──────────────────────────────────────────────────────────

export interface SitRepReportRow {
  id: string;
  session_id: string | null;
  user_id: string | null;
  generated_at: string;
  elapsed_seconds: number;
  tick: number;
  flooded_area_sqkm: number;
  affected_population: number;
  critical_zone_count: number;
  max_water_depth: number;
  rainfall_intensity_mmhr: number;
  active_pumps_count: number;
  bahini_bharalu_flow_m3s: number;
  sluice_gate_open: boolean;
  brahmaputra_stage_m: number;
  compromised_infrastructure: Json;
  active_disasters: Json;
  scenario_id: string;
  scenario_name: string;
  created_at: string;
}

export interface SitRepReportInsert {
  id?: string;
  session_id?: string | null;
  user_id?: string | null;
  generated_at?: string;
  elapsed_seconds: number;
  tick: number;
  flooded_area_sqkm: number;
  affected_population: number;
  critical_zone_count: number;
  max_water_depth: number;
  rainfall_intensity_mmhr: number;
  active_pumps_count: number;
  bahini_bharalu_flow_m3s: number;
  sluice_gate_open: boolean;
  brahmaputra_stage_m: number;
  compromised_infrastructure?: Json;
  active_disasters?: Json;
  scenario_id: string;
  scenario_name: string;
}

// ─── comparison_benchmarks ───────────────────────────────────────────────────

export interface ComparisonBenchmarkRow {
  id: string;
  computed_at: string;
  scenario_id: string;
  scenario_name: string;
  peak_flooded_area_sqkm: number;
  peak_affected_population: number;
  peak_water_depth: number;
  time_to_first_critical_min: number | null;
  infrastructure_compromised_count: number;
  data_points: Json;
  config_hash: string;
  created_at: string;
}

export interface ComparisonBenchmarkInsert {
  id?: string;
  computed_at?: string;
  scenario_id: string;
  scenario_name: string;
  peak_flooded_area_sqkm: number;
  peak_affected_population: number;
  peak_water_depth: number;
  time_to_first_critical_min?: number | null;
  infrastructure_compromised_count: number;
  data_points: Json;
  config_hash: string;
}

// ─── emergency_calls ─────────────────────────────────────────────────────────

export interface EmergencyCallRow {
  id: string;
  call_id: string;
  caller_id: string;
  mode: 'browser' | 'phone';
  status: 'initiating' | 'active' | 'completed' | 'failed';
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  exotel_call_id: string | null;
  summary: string | null;
  transcript: Json;
  extracted_location: string | null;
  extracted_water_level_m: number | null;
  urgency_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  needs_evacuation: boolean;
  caller_name: string | null;
  notes: string | null;
  simulation_session_id: string | null;
  created_at: string;
}

export interface EmergencyCallInsert {
  id?: string;
  call_id: string;
  caller_id: string;
  mode: 'browser' | 'phone';
  status?: 'initiating' | 'active' | 'completed' | 'failed';
  start_time?: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  exotel_call_id?: string | null;
  summary?: string | null;
  transcript?: Json;
  extracted_location?: string | null;
  extracted_water_level_m?: number | null;
  urgency_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  needs_evacuation?: boolean;
  caller_name?: string | null;
  notes?: string | null;
  simulation_session_id?: string | null;
}

// ─── cell_interventions ──────────────────────────────────────────────────────

export interface CellInterventionRow {
  id: string;
  session_id: string;
  user_id: string | null;
  cell_id: string;
  cell_name: string;
  action_type: 'BARRIER_DEPLOYED' | 'BARRIER_REMOVED' | 'DRAIN_BLOCKED' | 'DRAIN_UNBLOCKED' | 'EVACUATION_ORDERED' | 'EVACUATION_CANCELLED';
  tick_applied: number;
  water_level_at_action: number;
  created_at: string;
}

export interface CellInterventionInsert {
  id?: string;
  session_id: string;
  user_id?: string | null;
  cell_id: string;
  cell_name: string;
  action_type: 'BARRIER_DEPLOYED' | 'BARRIER_REMOVED' | 'DRAIN_BLOCKED' | 'DRAIN_UNBLOCKED' | 'EVACUATION_ORDERED' | 'EVACUATION_CANCELLED';
  tick_applied: number;
  water_level_at_action: number;
}

// ─── user_profiles ───────────────────────────────────────────────────────────

export interface UserProfileRow {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  organization: string | null;
  role: 'operator' | 'supervisor' | 'admin';
  preferred_scenario_id: string | null;
  notification_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  id?: string;
  clerk_user_id: string;
  display_name?: string | null;
  organization?: string | null;
  role?: 'operator' | 'supervisor' | 'admin';
  preferred_scenario_id?: string | null;
  notification_phone?: string | null;
}
