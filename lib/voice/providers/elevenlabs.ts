export class ElevenLabsVoiceProvider {
  private apiKey: string;
  private voiceId: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    this.model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async synthesize(text: string): Promise<Buffer | null> {
    if (!this.apiKey || !text) return null;

    const voicesToTry = [this.voiceId, 'EXAVITQu4vr4xnSDxMaL'].filter((v, i, a) => a.indexOf(v) === i);

    for (const voiceId of voicesToTry) {
      try {
        const url = `${this.baseUrl}/text-to-speech/${voiceId}?output_format=mp3_44100_128&optimize_streaming_latency=3`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: this.model,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }

        const errText = await res.text();
        console.warn(`[ElevenLabs] TTS error status with voice ${voiceId}:`, res.status, errText);
      } catch (err) {
        console.warn(`[ElevenLabs] TTS exception with voice ${voiceId}:`, err);
      }
    }

    // High-fidelity fallback if ElevenLabs quota is exceeded or unavailable
    return this.synthesizeWithFallback(text);
  }

  private async synthesizeWithFallback(text: string): Promise<Buffer | null> {
    try {
      // Split into clean sentence chunks for seamless TTS stream
      const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      const buffers: Buffer[] = [];

      for (const chunk of chunks.slice(0, 4)) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;
        const encoded = encodeURIComponent(trimmed.slice(0, 190));
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-IN&client=tw-ob&q=${encoded}`;
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          },
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          buffers.push(Buffer.from(arrayBuffer));
        }
      }

      if (buffers.length > 0) {
        console.log(`[TTS Fallback] Successfully synthesized ${buffers.length} audio chunks for emergency dispatch`);
        return Buffer.concat(buffers);
      }
    } catch (e) {
      console.error('[TTS Fallback] Synthesis error:', e);
    }
    return null;
  }
}
