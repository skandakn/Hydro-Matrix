/**
 * HYDRO MATRIX: SitRep Reports API
 * POST /api/sitrep — save a SitRep report
 * GET  /api/sitrep — list recent SitRep reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { saveSitRep, getRecentSitReps } from '@/lib/db/sitrep';
import type { SitRepReportInsert } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json() as SitRepReportInsert;

    const report = await saveSitRep({
      ...body,
      user_id: userId ?? null,
    });

    if (!report) {
      return NextResponse.json({ error: 'Failed to save SitRep' }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/sitrep error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const reports = await getRecentSitReps(limit);
    return NextResponse.json({ reports });
  } catch (err) {
    console.error('[API] GET /api/sitrep error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
