/**
 * HYDRO MATRIX: Session Update API
 * PATCH /api/sessions/[id] — update KPIs / mark session ended
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/db/sessions';
import type { SimulationSessionInsert } from '@/types/database';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as Partial<SimulationSessionInsert>;
    const updated = await updateSession(params.id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Session not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error('[API] PATCH /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
