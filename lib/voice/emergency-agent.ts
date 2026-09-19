import { CallSession, ExtractedIncidentData } from './types';
import { GeminiVoiceProvider } from './providers/gemini';
import { ElevenLabsVoiceProvider } from './providers/elevenlabs';
import { GroqWhisperProvider } from './providers/groq-whisper';
import { ExotelTelephonyProvider } from './providers/exotel';
import { upsertEmergencyCall, updateCallStatus } from '@/lib/db/calls';
import { Json } from '@/types/database';

// In-memory call storage for active dashboard sessions (hot path)
const callStore: Map<string, CallSession> = new Map();

// Seed initial sample emergency call for tactical demonstration
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
        text: 'HYDRO MATRIX Emergency Hotline: Rescue team dispatched. Switch off power mains and climb to second floor.',
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

  // Persist the seed call to Supabase (fire-and-forget)
  upsertEmergencyCall({
    call_id: 'call_dis_01',
    caller_id: '+91 98640 12345 (Anil Nagar)',
    mode: 'phone',
    status: 'completed',
    start_time: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    end_time: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    duration_seconds: 180,
    summary: 'Water breach at Anil Nagar. SDRF boat dispatched.',
    transcript: [
      { id: '1', speaker: 'caller', text: 'Water entered ground floor, Bahini drain overflowed. 3 people stuck.', timestamp: Date.now() - 1000 * 60 * 18 },
      { id: '2', speaker: 'assistant', text: 'HYDRO MATRIX Emergency Hotline: Rescue team dispatched. Switch off power mains and climb to second floor.', timestamp: Date.now() - 1000 * 60 * 17 },
    ],
    caller_name: 'Bipul Sarma',
    extracted_location: 'Anil Nagar By-lane 3',
    extracted_water_level_m: 1.2,
    urgency_level: 'CRITICAL',
    needs_evacuation: true,
    notes: '3 citizens, power mains need disconnect',
  }).catch(() => { /* non-critical */ });
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
          text: 'HYDRO MATRIX Emergency Hotline: Guwahati Bahini-Bharalu Basin Crisis Command. Please describe your situation.',
          timestamp: Date.now(),
        },
      ],
    };
    callStore.set(id, session);

    // Persist to Supabase immediately (fire-and-forget)
    upsertEmergencyCall({
      call_id: id,
      caller_id: callerId,
      mode,
      status: 'active',
      start_time: new Date(session.startTime).toISOString(),
      transcript: session.transcript as unknown as Json,
      needs_evacuation: false,
    }).catch(() => { /* non-critical */ });

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

    // 3. Update in-memory session transcript & extracted data
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

      // 4. Persist updated transcript + extracted data to Supabase (fire-and-forget)
      updateCallStatus(callId, {
        transcript: session.transcript as unknown as Json,
        extracted_location: incidentData?.location ?? session.extractedData?.location ?? null,
        extracted_water_level_m: incidentData?.waterLevelMeters ?? session.extractedData?.waterLevelMeters ?? null,
        urgency_level: (incidentData?.urgencyLevel ?? session.extractedData?.urgencyLevel ?? null) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined,
        needs_evacuation: incidentData?.needsEvacuation ?? session.extractedData?.needsEvacuation ?? false,
        caller_name: incidentData?.callerName ?? session.extractedData?.callerName ?? null,
        notes: incidentData?.notes ?? session.extractedData?.notes ?? null,
      }).catch(() => { /* non-critical */ });
    }

    return { responseText, audioBase64, incident: incidentData };
  }

  public async endSession(callId: string): Promise<void> {
    const session = callStore.get(callId);
    if (!session) return;
    session.status = 'completed';
    session.endTime = Date.now();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);

    await updateCallStatus(callId, {
      status: 'completed',
      end_time: new Date(session.endTime).toISOString(),
      duration_seconds: session.duration,
      transcript: session.transcript as unknown as Json,
      summary: session.summary ?? null,
    });
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

      // Update Supabase with exotel ID and extracted data
      updateCallStatus(session.id, {
        exotel_call_id: res.callId,
        extracted_location: location,
        urgency_level: threatLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        needs_evacuation: true,
        notes: session.extractedData.notes,
      }).catch(() => { /* non-critical */ });
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
