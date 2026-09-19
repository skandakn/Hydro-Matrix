/**
 * HYDRO MATRIX: Comparison Benchmarks API
 * GET  /api/benchmarks — fetch cached benchmarks for all scenarios
 * POST /api/benchmarks — save/upsert computed benchmarks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllBenchmarks, upsertBenchmarks } from '@/lib/db/benchmarks';
import type { ComparisonBenchmarkInsert } from '@/types/database';

export async function GET() {
  try {
    const benchmarks = await getAllBenchmarks();
    return NextResponse.json({ benchmarks });
  } catch (err) {
    console.error('[API] GET /api/benchmarks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { records: ComparisonBenchmarkInsert[] };
    const ok = await upsertBenchmarks(body.records ?? []);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to upsert benchmarks' }, { status: 500 });
    }
    return NextResponse.json({ saved: body.records?.length ?? 0 }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/benchmarks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
