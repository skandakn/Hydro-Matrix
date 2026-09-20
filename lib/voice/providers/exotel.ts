export class ExotelTelephonyProvider {
  private apiKey: string;
  private apiToken: string;
  private accountSid: string;
  private callerId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.EXOTEL_API_KEY?.trim() || '';
    this.apiToken = process.env.EXOTEL_API_TOKEN?.trim() || '';
    this.accountSid = process.env.EXOTEL_SID?.trim() || '';
    this.callerId = process.env.EXOTEL_CALLER_ID?.trim() || '';
    this.baseUrl = (process.env.EXOTEL_BASE_URL || 'https://api.exotel.com').replace(/\/$/, '');
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiToken && this.accountSid);
  }

  public getConfigurationDetails(): {
    isConfigured: boolean;
    hasSid: boolean;
    hasKey: boolean;
    hasToken: boolean;
    hasCallerId: boolean;
    sidIsApiKeyMismatch: boolean;
    callerId: string;
  } {
    const hasSid = Boolean(this.accountSid);
    const hasKey = Boolean(this.apiKey);
    const hasToken = Boolean(this.apiToken);
    const hasCallerId = Boolean(this.callerId);
    // If accountSid equals apiKey (and length > 30), it's likely the user pasted the API key into EXOTEL_SID
    const sidIsApiKeyMismatch = Boolean(hasSid && hasKey && this.accountSid === this.apiKey);

    return {
      isConfigured: this.isConfigured(),
      hasSid,
      hasKey,
      hasToken,
      hasCallerId,
      sidIsApiKeyMismatch,
      callerId: this.callerId,
    };
  }

  /**
   * Normalize phone number to format preferred by Exotel (clean digits, +91 or 0 prefix)
   */
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
    return cleaned;
  }

  /**
   * Outbound phone call dispatch via Exotel API
   */
  public async createCall(
    toPhone: string,
    fromPhone?: string,
    customCallerId?: string
  ): Promise<{ success: boolean; callId?: string; error?: string; diagnostic?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Exotel credentials not configured in environment (.env.local).',
        diagnostic: 'Please provide EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_SID.',
      };
    }

    if (this.accountSid === this.apiKey) {
      return {
        success: false,
        error: 'EXOTEL_SID is set to your API Key instead of your Account SID.',
        diagnostic:
          'In Exotel, your Account SID is your Subdomain/Account ID (found in Exotel Dashboard -> Settings -> API Settings or your dashboard URL my.exotel.com/<account_sid>), not the 48-char API Key.',
      };
    }

    const effectiveCallerId = (customCallerId || this.callerId || fromPhone || '').trim();
    const normalizedTo = this.normalizePhone(toPhone);
    const normalizedFrom = fromPhone ? this.normalizePhone(fromPhone) : normalizedTo;

    if (!effectiveCallerId) {
      return {
        success: false,
        error: 'ExoPhone (CallerId) is missing.',
        diagnostic:
          'Exotel requires an active ExoPhone (Virtual Number assigned to your Exotel account) as the CallerId. Set EXOTEL_CALLER_ID in .env.local or enter your ExoPhone in the dispatch form.',
      };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
      // Using .json endpoint provides cleaner JSON responses from Exotel
      const endpoint = `${this.baseUrl}/v1/Accounts/${this.accountSid}/Calls/connect.json`;

      const body = new URLSearchParams({
        From: normalizedFrom,
        To: normalizedTo,
        CallerId: effectiveCallerId,
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

      const responseText = await res.text();
      let responseJson: Record<string, unknown> | null = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // May return XML if endpoint defaults
      }

      if (res.ok) {
        let callId = `exo_${Date.now()}`;
        if (responseJson && typeof responseJson === 'object') {
          const callObj = responseJson.Call as Record<string, unknown> | undefined;
          if (callObj?.Sid) callId = String(callObj.Sid);
        } else {
          const match = responseText.match(/<Sid>(.*?)<\/Sid>/);
          if (match) callId = match[1];
        }
        return { success: true, callId };
      }

      // Parse error details
      let errorMsg = `Exotel HTTP ${res.status}`;
      let errorCode = '';
      let diagnostic = '';

      if (responseJson && responseJson.RestException) {
        const exc = responseJson.RestException as Record<string, unknown>;
        errorMsg = String(exc.Message || errorMsg).trim();
        errorCode = String(exc.Code || '');
      } else {
        const msgMatch = responseText.match(/<Message>(.*?)<\/Message>/);
        if (msgMatch) errorMsg = msgMatch[1].trim();
        const codeMatch = responseText.match(/<Code>(.*?)<\/Code>/);
        if (codeMatch) errorCode = codeMatch[1].trim();
      }

      // Provide tailored actionable advice based on Exotel status & error codes
      if (res.status === 403 || errorCode === '34009') {
        diagnostic =
          'Action forbidden: (1) Ensure EXOTEL_SID is your actual Exotel Subdomain/Account SID from API Settings; (2) Ensure CallerId is an ExoPhone owned by your account; (3) On trial accounts, verify the destination number is added to your Exotel Whitelist.';
      } else if (res.status === 401) {
        diagnostic = 'Authentication failed. Please verify your EXOTEL_API_KEY and EXOTEL_API_TOKEN.';
      } else if (errorCode === '34004' || errorCode === '34005') {
        diagnostic = 'Number not whitelisted. Exotel trial accounts only allow calling whitelisted numbers.';
      }

      return {
        success: false,
        error: `${errorMsg}${errorCode ? ` (Code ${errorCode})` : ''}`,
        diagnostic,
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

