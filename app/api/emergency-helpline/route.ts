import { NextRequest, NextResponse } from 'next/server';
import { getEmergencyVoiceAgent } from '@/lib/voice/emergency-agent';

export async function GET() {
  const agent = getEmergencyVoiceAgent();
  const status = agent.getSystemStatus();
  const calls = agent.listCalls();

  return NextResponse.json({
    name: 'FLOWSHIELD Emergency Flood Helpline & Calling System',
    region: 'Guwahati — Bahini/Bharalu Basin',
    status: 'ONLINE',
    providers: {
      gemini: { configured: status.gemini, role: 'Emergency Crisis Reasoning (Gemini 2.5 Flash)' },
      groqWhisper: { configured: status.groqWhisper, role: 'Ultra-Fast Speech Transcription' },
      elevenLabs: { configured: status.elevenLabs, role: 'Tactical Voice Synthesis (Flash v2.5)' },
      exotel: { configured: status.exotel, role: 'Automated Telephony & Outbound Call Dispatch' },
    },
    metrics: {
      activeCalls: status.activeSessions,
      totalLoggedCalls: status.totalLoggedCalls,
    },
    recentCalls: calls.slice(0, 5),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = getEmergencyVoiceAgent();

    if (body.action === 'dispatch_phone') {
      const { phone, location = 'Bahini Basin', threatLevel = 'CRITICAL' } = body;
      if (!phone) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }
      const result = await agent.dispatchExotelAlert(phone, location, threatLevel);
      return NextResponse.json(result);
    }

    // Default action: start interactive browser session
    const callerId = body.callerId || 'Guwahati Citizen';
    const session = agent.createSession(callerId, 'browser');

    return NextResponse.json({
      success: true,
      session,
      greeting: session.transcript[0].text,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Helpline error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

