import { TranscriptItem, ExtractedIncidentData } from '../types';

export class GeminiVoiceProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async generateEmergencyResponse(
    userMessage: string,
    history: TranscriptItem[] = []
  ): Promise<{ responseText: string; incidentData?: ExtractedIncidentData }> {
    if (!this.apiKey) {
      return {
        responseText:
          'Guwahati Flood Emergency Command: Water rescue units are standing by. Please state your exact ward location and current water level.',
      };
    }

    const systemInstruction = `You are FLOWSHIELD, the AI Emergency Flood Response & Evacuation Dispatcher for Guwahati Metropolitan Development Authority (GMDA) and Assam SDMA.
Your role:
1. Provide immediate, calm, actionable life-safety advice for urban flash flooding along the Bahini/Bharalu basin (e.g. Anil Nagar, Nabin Nagar, Tarun Nagar, Zoo Road, Lachit Nagar, Hatigaon).
2. Urgently ask for location, estimated water depth, and if any elderly/children require immediate evacuation boat dispatch.
3. Keep responses concise (under 2 sentences) because your response will be read over telephone or audio synthesizer.
4. Always prioritize human life, electrical hazard warnings, and directing victims to elevated relief camps or GMDA rescue centers.`;

    const contents = [
      ...history.slice(-4).map((h) => ({
        role: h.speaker === 'caller' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const modelPool = [this.model, 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let responseText = '';

    for (const m of modelPool) {
      try {
        const res = await fetch(`${this.baseUrl}/models/${m}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 150,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          responseText =
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (responseText) break;
        }
      } catch (err) {
        console.error(`[Gemini] Error with model ${m}:`, err);
      }
    }

    if (!responseText) {
      responseText =
        'FLOWSHIELD Emergency Hotline: Rescue teams are mobilized in Bahini and Bharalu basins. Remain on elevated ground away from transformers.';
    }

    // Heuristic extraction for emergency incident dashboard
    const isCritical =
      /danger|drowning|trapped|chest|waist|roof|critical|sos|rescue/i.test(
        userMessage + ' ' + responseText
      );
    const incidentData: ExtractedIncidentData = {
      urgencyLevel: isCritical ? 'CRITICAL' : 'HIGH',
      needsEvacuation: isCritical || /boat|evacuat/i.test(userMessage),
      notes: `Citizen report: "${userMessage.substring(0, 100)}"`,
    };

    return { responseText, incidentData };
  }
}
