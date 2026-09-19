/**
 * HYDRO MATRIX: Emergency Calls DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { EmergencyCallInsert, EmergencyCallRow } from '@/types/database';

export async function upsertEmergencyCall(data: EmergencyCallInsert): Promise<EmergencyCallRow | null> {
  const db = createServerSupabaseClient();
  const { data: row, error } = await db
    .from('emergency_calls')
    .upsert(data, { onConflict: 'call_id' })
    .select()
    .single();
  if (error) {
    console.error('[DB] upsertEmergencyCall error:', error.message);
    return null;
  }
  return row;
}

export async function getRecentCalls(limit = 20): Promise<EmergencyCallRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('emergency_calls')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[DB] getRecentCalls error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function updateCallStatus(
  callId: string,
  updates: Partial<EmergencyCallInsert>
): Promise<boolean> {
  const db = createServerSupabaseClient();
  const { error } = await db
    .from('emergency_calls')
    .update(updates)
    .eq('call_id', callId);
  if (error) {
    console.error('[DB] updateCallStatus error:', error.message);
    return false;
  }
  return true;
}
