/**
 * HYDRO MATRIX: Simulation Sessions API
 * POST /api/sessions  — create a new session
 * GET  /api/sessions  — list recent sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSession, getRecentSessions, getSessionsByUser } from '@/lib/db/sessions';
import type { SimulationSessionInsert } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json() as SimulationSessionInsert;

    const session = await createSession({
      ...body,
      user_id: userId ?? null,
    });

    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/sessions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);

    const sessions = userId
      ? await getSessionsByUser(userId, limit)
      : await getRecentSessions(limit);

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('[API] GET /api/sessions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
