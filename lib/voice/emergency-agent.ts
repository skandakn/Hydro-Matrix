import { CallSession, ExtractedIncidentData } from './types';
import { GeminiVoiceProvider } from './providers/gemini';

import { ElevenLabsVoiceProvider } from './providers/elevenlabs';
import { GroqWhisperProvider } from './providers/groq-whisper';
import { ExotelTelephonyProvider } from './providers/exotel';

// In-memory call storage for active dashboard sessions
const callStore: Map<string, CallSession> = new Map();

// Seed initial sample emergency calls for tactical demonstration
if (callStore.size === 0) {
  callStore.set('call_dis_01', {
    id: 'call_dis_01',
    callerId: '+91 98640 12345 (Anil Nagar)',
    mode: 'phone',
    status: 'completed',
    startTime: Date.now() - 1000 * 60 * 18,
    endTime: Date.now() - 1000 * 60 * 15,
    duration: 180,
    transcript: [
      {
        id: '1',
        speaker: 'caller',
        text: 'Water entered ground floor, Bahini drain overflowed. 3 people stuck.',
        timestamp: Date.now() - 1000 * 60 * 18,
      },
      {
        id: '2',
        speaker: 'assistant',
        text: 'FLOWSHIELD: Rescue team dispatched. Switch off power mains and climb to second floor.',
        timestamp: Date.now() - 1000 * 60 * 17,
      },
    ],
    extractedData: {
      callerName: 'Bipul Sarma',
      location: 'Anil Nagar By-lane 3',
      waterLevelMeters: 1.2,
      urgencyLevel: 'CRITICAL',
      needsEvacuation: true,
      notes: '3 citizens, power mains need disconnect',
    },
    summary: 'Water breach at Anil Nagar. SDRF boat dispatched.',
  });
}

export class EmergencyVoiceAgent {
  private gemini = new GeminiVoiceProvider();
  private elevenLabs = new ElevenLabsVoiceProvider();
  private groq = new GroqWhisperProvider();
  private exotel = new ExotelTelephonyProvider();

  public getSystemStatus() {
    return {
      gemini: this.gemini.isConfigured(),
      groqWhisper: this.groq.isConfigured(),
      elevenLabs: this.elevenLabs.isConfigured(),
      exotel: this.exotel.isConfigured(),
      activeSessions: Array.from(callStore.values()).filter((c) => c.status === 'active').length,
      totalLoggedCalls: callStore.size,
    };
  }

  public listCalls(): CallSession[] {
    return Array.from(callStore.values()).sort((a, b) => b.startTime - a.startTime);
  }

  public getCall(id: string): CallSession | undefined {
    return callStore.get(id);
  }

  public createSession(callerId: string, mode: 'browser' | 'phone'): CallSession {
    const id = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const session: CallSession = {
      id,
      callerId,
      mode,
      status: 'active',
      startTime: Date.now(),
      transcript: [
        {
          id: 'init_msg',
          speaker: 'assistant',
          text: 'FLOWSHIELD Emergency Hotline: Guwahati Bahini-Bharalu Basin Crisis Command. Please describe your situation.',
          timestamp: Date.now(),
        },
      ],
    };
    callStore.set(id, session);
    return session;
  }

  public async processUserSpeech(
    callId: string,
    userText: string
  ): Promise<{ responseText: string; audioBase64?: string; incident?: ExtractedIncidentData }> {
    const session = callStore.get(callId);
    const history = session ? session.transcript : [];

    // 1. Generate intelligent emergency response with Gemini
    const { responseText, incidentData } = await this.gemini.generateEmergencyResponse(userText, history);

    // 2. Synthesize low-latency natural voice with ElevenLabs
    const audioBuffer = await this.elevenLabs.synthesize(responseText);
    const audioBase64 = audioBuffer ? audioBuffer.toString('base64') : undefined;

    // 3. Update session transcript & extracted data
    if (session) {
      session.transcript.push({
        id: `user_${Date.now()}`,
        speaker: 'caller',
        text: userText,
        timestamp: Date.now(),
      });
      session.transcript.push({
        id: `agent_${Date.now()}`,
        speaker: 'assistant',
        text: responseText,
        timestamp: Date.now(),
      });
      if (incidentData) {
        session.extractedData = incidentData;
      }
    }

    return { responseText, audioBase64, incident: incidentData };
  }

  public async dispatchExotelAlert(
    phone: string,
    location: string,
    threatLevel: string
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    const res = await this.exotel.createCall(phone);
    if (res.success) {
      const session = this.createSession(phone, 'phone');
      session.exotelCallId = res.callId;
      session.extractedData = {
        callerPhone: phone,
        location,
        urgencyLevel: threatLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        needsEvacuation: true,
        notes: `Automated flood alert dispatched via Exotel to ${phone} for ${location}`,
      };
    }
    return res;
  }
}

let agentInstance: EmergencyVoiceAgent | null = null;
export function getEmergencyVoiceAgent(): EmergencyVoiceAgent {
  if (!agentInstance) {
    agentInstance = new EmergencyVoiceAgent();
  }
  return agentInstance;
}
