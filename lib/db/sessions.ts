/**
 * HYDRO MATRIX: Simulation Session DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { SimulationSessionInsert, SimulationSessionRow } from '@/types/database';

export async function createSession(data: SimulationSessionInsert): Promise<SimulationSessionRow | null> {
  const db = createServerSupabaseClient();
  const { data: row, error } = await db
    .from('simulation_sessions')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('[DB] createSession error:', error.message);
    return null;
  }
  return row;
}

export async function updateSession(
  id: string,
  updates: Partial<SimulationSessionInsert>
): Promise<SimulationSessionRow | null> {
  const db = createServerSupabaseClient();
  const { data: row, error } = await db
    .from('simulation_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[DB] updateSession error:', error.message);
    return null;
  }
  return row;
}

export async function getSessionsByUser(userId: string, limit = 20): Promise<SimulationSessionRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('simulation_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[DB] getSessionsByUser error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getRecentSessions(limit = 10): Promise<SimulationSessionRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('simulation_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[DB] getRecentSessions error:', error.message);
    return [];
  }
  return data ?? [];
}
