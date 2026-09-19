export class ExotelTelephonyProvider {
  private apiKey: string;
  private apiToken: string;
  private accountSid: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.EXOTEL_API_KEY || '';
    this.apiToken = process.env.EXOTEL_API_TOKEN || '';
    this.accountSid = process.env.EXOTEL_SID || process.env.EXOTEL_API_KEY || '';
    this.baseUrl = (process.env.EXOTEL_BASE_URL || 'https://api.exotel.com').replace(/\/$/, '');
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiToken && this.accountSid);
  }

  /**
   * Outbound phone call dispatch via Exotel API
   */
  public async createCall(toPhone: string, fromPhone?: string): Promise<{ success: boolean; callId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel credentials not configured in environment.',
      };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
      const endpoint = `${this.baseUrl}/v1/Accounts/${this.accountSid}/Calls/connect`;

      const body = new URLSearchParams({
        From: fromPhone || '08088919888',
        To: toPhone,
        CallerId: fromPhone || '08088919888',
        CallType: 'trans',
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const text = await res.text();

      if (res.ok) {
        // Exotel returns XML with CallSid
        const match = text.match(/<Sid>(.*?)<\/Sid>/);
        const callId = match ? match[1] : `exo_${Date.now()}`;
        return { success: true, callId };
      }

      return {
        success: false,
        error: `Exotel returned HTTP ${res.status}: ${text.substring(0, 150)}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dispatch Exotel call';
      return {
        success: false,
        error: message,
      };
    }
  }
}

