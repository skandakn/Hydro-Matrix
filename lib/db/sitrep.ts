/**
 * HYDRO MATRIX: SitRep Reports DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { SitRepReportInsert, SitRepReportRow } from '@/types/database';

export async function saveSitRep(data: SitRepReportInsert): Promise<SitRepReportRow | null> {
  const db = createServerSupabaseClient();
  const { data: row, error } = await db
    .from('sitrep_reports')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('[DB] saveSitRep error:', error.message);
    return null;
  }
  return row;
}

export async function getRecentSitReps(limit = 20): Promise<SitRepReportRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('sitrep_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[DB] getRecentSitReps error:', error.message);
    return [];
  }
  return data ?? [];
}
