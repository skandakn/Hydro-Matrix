import { NextResponse } from 'next/server';
import { getEmergencyVoiceAgent } from '@/lib/voice/emergency-agent';

export async function GET() {
  const agent = getEmergencyVoiceAgent();
  const calls = agent.listCalls();
  const status = agent.getSystemStatus();

  return NextResponse.json({
    calls,
    total: calls.length,
    status,
  });
}
