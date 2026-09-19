export interface TranscriptItem {
  id: string;
  speaker: 'caller' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export interface ExtractedIncidentData {
  callerName?: string;
  callerPhone?: string;
  location?: string;
  waterLevelMeters?: number;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  needsEvacuation: boolean;
  notes?: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  mode: 'browser' | 'phone';
  status: 'initiating' | 'active' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  transcript: TranscriptItem[];
  extractedData?: ExtractedIncidentData;
  summary?: string;
  exotelCallId?: string;
}
