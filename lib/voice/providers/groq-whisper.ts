export class GroqWhisperProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
    this.baseUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async transcribe(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.apiKey || !audioBuffer || audioBuffer.length === 0) return '';

    try {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const formParts: Buffer[] = [];

      formParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${this.model}\r\n`
        )
      );

      formParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`
        )
      );

      const ext = mimeType.includes('mp3') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
      formParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
        )
      );
      formParts.push(audioBuffer);
      formParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const payload = Buffer.concat(formParts);

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: payload,
      });

      if (!res.ok) {
        console.error('[GroqWhisper] STT error:', res.status, await res.text());
        return '';
      }

      const data = await res.json();
      return data.text || '';
    } catch (err) {
      console.error('[GroqWhisper] STT exception:', err);
      return '';
    }
  }
}
