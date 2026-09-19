import { NextRequest, NextResponse } from 'next/server';
import { getEmergencyVoiceAgent } from '@/lib/voice/emergency-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callId, text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text message required' }, { status: 400 });
    }

    const agent = getEmergencyVoiceAgent();
    const result = await agent.processUserSpeech(callId || 'default_session', text);

    return NextResponse.json({
      success: true,
      responseText: result.responseText,
      audioBase64: result.audioBase64,
      incident: result.incident,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Voice processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

