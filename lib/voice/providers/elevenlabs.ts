export class ElevenLabsVoiceProvider {
  private apiKey: string;
  private voiceId: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    this.model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async synthesize(text: string): Promise<Buffer | null> {
    if (!this.apiKey || !text) return null;

    try {
      const url = `${this.baseUrl}/text-to-speech/${this.voiceId}?output_format=mp3_44100_128&optimize_streaming_latency=3`;
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

      if (!res.ok) {
        console.error('[ElevenLabs] TTS error status:', res.status);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('[ElevenLabs] TTS exception:', err);
      return null;
    }
  }
}
