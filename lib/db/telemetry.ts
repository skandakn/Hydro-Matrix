/**
 * HYDRO MATRIX: Telemetry History DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { TelemetryHistoryInsert, TelemetryHistoryRow } from '@/types/database';

/** Batch upsert multiple telemetry points for a session */
export async function upsertTelemetryBatch(points: TelemetryHistoryInsert[]): Promise<boolean> {
  if (points.length === 0) return true;
  const db = createServerSupabaseClient();
  const { error } = await db.from('telemetry_history').insert(points);
  if (error) {
    console.error('[DB] upsertTelemetryBatch error:', error.message);
    return false;
  }
  return true;
}

export async function getTelemetryForSession(sessionId: string): Promise<TelemetryHistoryRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('telemetry_history')
    .select('*')
    .eq('session_id', sessionId)
    .order('tick', { ascending: true });
  if (error) {
    console.error('[DB] getTelemetryForSession error:', error.message);
    return [];
  }
  return data ?? [];
}
