/**
 * HYDRO MATRIX: Telemetry Batch Write API
 * POST /api/sessions/[id]/telemetry — batch write telemetry points
 * GET  /api/sessions/[id]/telemetry — fetch all telemetry for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { upsertTelemetryBatch, getTelemetryForSession } from '@/lib/db/telemetry';
import type { TelemetryHistoryInsert } from '@/types/database';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as { points: TelemetryHistoryInsert[] };
    const points = (body.points ?? []).map(p => ({
      ...p,
      session_id: params.id,
    }));

    const ok = await upsertTelemetryBatch(points);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to write telemetry' }, { status: 500 });
    }

    return NextResponse.json({ written: points.length });
  } catch (err) {
    console.error('[API] POST telemetry error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const points = await getTelemetryForSession(params.id);
    return NextResponse.json({ points });
  } catch (err) {
    console.error('[API] GET telemetry error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
