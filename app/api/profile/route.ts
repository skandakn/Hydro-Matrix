/**
 * HYDRO MATRIX: User Profile API
 * GET  /api/profile — get current user's profile
 * POST /api/profile — upsert profile on first sign-in
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { upsertUserProfile, getUserProfile } from '@/lib/db/profiles';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ profile: null });
    }

    const profile = await getUserProfile(userId);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[API] GET /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const profile = await upsertUserProfile({
      clerk_user_id: userId,
      display_name: body.display_name ?? null,
      organization: body.organization ?? null,
      role: body.role ?? 'operator',
      preferred_scenario_id: body.preferred_scenario_id ?? null,
      notification_phone: body.notification_phone ?? null,
    });

    if (!profile) {
      return NextResponse.json({ error: 'Failed to upsert profile' }, { status: 500 });
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
