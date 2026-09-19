/**
 * HYDRO MATRIX: Comparison Benchmarks DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ComparisonBenchmarkInsert, ComparisonBenchmarkRow } from '@/types/database';

/** Upsert benchmarks keyed by (scenario_id, config_hash) */
export async function upsertBenchmarks(records: ComparisonBenchmarkInsert[]): Promise<boolean> {
  if (records.length === 0) return true;
  const db = createServerSupabaseClient();
  const { error } = await db
    .from('comparison_benchmarks')
    .upsert(records, { onConflict: 'scenario_id,config_hash' });
  if (error) {
    console.error('[DB] upsertBenchmarks error:', error.message);
    return false;
  }
  return true;
}

export async function getAllBenchmarks(): Promise<ComparisonBenchmarkRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('comparison_benchmarks')
    .select('*')
    .order('scenario_id');
  if (error) {
    console.error('[DB] getAllBenchmarks error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getBenchmarksByHash(hashes: string[]): Promise<ComparisonBenchmarkRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('comparison_benchmarks')
    .select('*')
    .in('config_hash', hashes);
  if (error) {
    console.error('[DB] getBenchmarksByHash error:', error.message);
    return [];
  }
  return data ?? [];
}
