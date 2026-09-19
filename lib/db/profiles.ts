/**
 * HYDRO MATRIX: User Profiles DB Helpers
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { UserProfileInsert, UserProfileRow } from '@/types/database';

export async function upsertUserProfile(data: UserProfileInsert): Promise<UserProfileRow | null> {
  const db = createServerSupabaseClient();
  const { data: row, error } = await db
    .from('user_profiles')
    .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'clerk_user_id' })
    .select()
    .single();
  if (error) {
    console.error('[DB] upsertUserProfile error:', error.message);
    return null;
  }
  return row;
}

export async function getUserProfile(clerkUserId: string): Promise<UserProfileRow | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('user_profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] getUserProfile error:', error.message);
  }
  return data ?? null;
}
