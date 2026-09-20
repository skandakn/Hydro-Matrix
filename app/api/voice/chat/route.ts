import { NextRequest, NextResponse } from 'next/server';
import { getEmergencyVoiceAgent } from '@/lib/voice/emergency-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callId, text, language = 'en' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text message required' }, { status: 400 });
    }

    const agent = getEmergencyVoiceAgent();
    const result = await agent.processUserSpeech(callId || 'default_session', text, language);

    const cleanText = (result.responseText || '').replace(/[*_#`]/g, '').trim();
    const firstSentence = cleanText.split(/[.!?]/)[0]?.slice(0, 180)?.trim() || cleanText.slice(0, 180).trim();
    const ttsLocale = language === 'as' ? 'as' : language === 'hi' ? 'hi' : language === 'bn' ? 'bn' : 'en-IN';
    const clientAudioUrl = firstSentence
      ? `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLocale}&client=tw-ob&q=${encodeURIComponent(firstSentence)}`
      : undefined;

    return NextResponse.json({
      success: true,
      responseText: result.responseText,
      audioBase64: result.audioBase64,
      clientAudioUrl,
      incident: result.incident,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Voice processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

