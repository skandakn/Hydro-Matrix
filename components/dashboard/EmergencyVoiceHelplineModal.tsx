'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUIContext } from '@/context/UIContext';
import {
  PhoneCall,
  Mic,
  MicOff,
  Send,
  Volume2,
  AlertTriangle,
  Radio,
  Sparkles,
  X,
  Clock,
  MapPin,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallSession } from '@/lib/voice/types';


export const EmergencyVoiceHelplineModal: React.FC = () => {
  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  // Mode: 'voice' | 'telephony' | 'logs'
  const [activeTab, setActiveTab] = useState<'voice' | 'telephony' | 'logs'>('voice');

  // Interactive Voice Hotline state
  const [messages, setMessages] = useState<{ speaker: 'caller' | 'assistant'; text: string; time: string }[]>([
    {
      speaker: 'assistant',
      text: 'FLOWSHIELD Emergency Hotline: Guwahati Bahini-Bharalu Basin Crisis Command. Please state your location and flood situation.',
      time: '00:00',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callId] = useState(`call_${Date.now()}`);

  // Telephony dispatch state
  const [dispatchPhone, setDispatchPhone] = useState('+91 98640 ');
  const [dispatchLocation, setDispatchLocation] = useState('Anil Nagar (Bharalu Basin)');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Call logs
  const [callLogs, setCallLogs] = useState<CallSession[]>([]);


  const chatBottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load system info on open
  useEffect(() => {
    if (activeModal === 'emergency_helpline') {
      fetch('/api/emergency-helpline')
        .then((res) => res.json())
        .then((data) => {
          if (data.recentCalls) setCallLogs(data.recentCalls);
        })
        .catch(console.error);
    }
  }, [activeModal]);


  if (activeModal !== 'emergency_helpline') return null;

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isProcessing) return;

    setInputText('');
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setMessages((prev) => [...prev, { speaker: 'caller', text: textToSend, time: timeStr }]);
    setIsProcessing(true);
    playTacticalAlertSound('action');

    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, text: textToSend }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { speaker: 'assistant', text: data.responseText, time: timeStr },
        ]);

        // Play ElevenLabs synthesized audio if returned
        if (data.audioBase64) {
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          audioRef.current.src = `data:audio/mpeg;base64,${data.audioBase64}`;
          setIsPlayingAudio(true);
          audioRef.current.onended = () => setIsPlayingAudio(false);
          audioRef.current.play().catch((e) => console.log('Audio autoplay prevented:', e));
        }
      }
    } catch (err) {
      console.error('Failed to process message:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatchExotelCall = async () => {
    if (!dispatchPhone.trim()) return;
    setIsDispatching(true);
    setDispatchStatus('Contacting Exotel telephony gateway...');
    playTacticalAlertSound('critical');

    try {
      const res = await fetch('/api/emergency-helpline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch_phone',
          phone: dispatchPhone,
          location: dispatchLocation,
          threatLevel: 'CRITICAL',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchStatus(`Exotel Call Dispatched Successfully! SID: ${data.callId || 'EXO_CONNECTED'}`);
      } else {
        setDispatchStatus(`Telephony notice: ${data.error || 'Outbound call queued'}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown dispatch error';
      setDispatchStatus(`Dispatch error: ${message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Browser SpeechRecognition fallback
  const toggleSpeechRecognition = () => {
    interface ISpeechRecognition {
      lang: string;
      interimResults: boolean;
      onstart: () => void;
      onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    }
    interface WindowWithSpeech {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    }
    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;



    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your current browser. Please type your message.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
        const transcriptText = event.results[0][0].transcript;
        setIsListening(false);
        if (transcriptText) {
          handleSendMessage(transcriptText);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col h-[650px] w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-md shadow-rose-500/20">
              <PhoneCall className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide text-white">
                  FLOWSHIELD AI Emergency Calling & Voice Helpline
                </h2>
                <Badge variant="critical" className="text-[10px] font-mono">
                  LIVE 24/7 DISPATCH
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Guwahati Bahini/Bharalu Flood Command • Multimodal Voice & Telephony Engine
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* System Capabilities / Provider Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/40 px-6 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-slate-300">Gemini 2.5 Flash</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <Radio className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-slate-300">Groq Whisper</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-300">ElevenLabs Flash</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <PhoneCall className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-slate-300">Exotel Telephony</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          {isPlayingAudio && (
            <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] animate-pulse">
              <Volume2 className="h-3.5 w-3.5" />
              <span>TRANSMITTING AUDIO STREAM</span>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-medium transition-all ${
              activeTab === 'voice'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Interactive Voice Hotline</span>
          </button>

          <button
            onClick={() => setActiveTab('telephony')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-medium transition-all ${
              activeTab === 'telephony'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span>Exotel Outbound Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-medium transition-all ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Emergency Call Logs ({callLogs.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'voice' && (
            <div className="flex flex-col h-full">
              {/* Messages container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.speaker === 'caller' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-mono">
                      <span>{m.speaker === 'caller' ? 'CITIZEN / CALLER' : 'FLOWSHIELD DISPATCHER'}</span>
                      <span>•</span>
                      <span>{m.time}</span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                        m.speaker === 'caller'
                          ? 'bg-cyan-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse font-mono">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Gemini analyzing flood condition & synthesizing response...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input bar */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                <Button
                  variant={isListening ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? 'Stop listening' : 'Start speaking with microphone'}
                  className={isListening ? 'animate-bounce' : 'border-slate-700'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-cyan-400" />}
                </Button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Report flood water level or ask evacuation guidance..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !inputText.trim()}
                  className="gap-1.5 text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </Button>
              </div>

              {/* Quick Prompt Badges */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono">Quick reports:</span>
                {[
                  'Water level is 3 feet high in Anil Nagar',
                  'Bharalu drain overflowed near Zoo Road',
                  'Need immediate evacuation boat for elderly',
                ].map((txt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(txt)}
                    className="text-[10px] rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-0.5 border border-slate-700 transition-colors"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'telephony' && (
            <div className="flex flex-col gap-6 max-w-xl mx-auto py-4">
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Outbound Exotel Telephony Dispatch</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Trigger automated outbound emergency phone calls via Exotel to warn ward councilors, emergency SDRF boat units, or registered citizens in designated inundation zones.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Mobile / Phone Number
                  </label>
                  <input
                    type="text"
                    value={dispatchPhone}
                    onChange={(e) => setDispatchPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Designated Critical Basin / Ward Location
                  </label>
                  <select
                    value={dispatchLocation}
                    onChange={(e) => setDispatchLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option>Anil Nagar (Bharalu Basin - High Risk)</option>
                    <option>Nabin Nagar (Bahini Basin - Overflow)</option>
                    <option>Tarun Nagar / Zoo Road Inundation Zone</option>
                    <option>Hatigaon / Sijubari Low-Lying Sector</option>
                    <option>Lachit Nagar Commercial Sector</option>
                  </select>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDispatchExotelCall}
                  disabled={isDispatching || !dispatchPhone.trim()}
                  className="w-full gap-2 py-3 text-sm font-semibold tracking-wide shadow-lg shadow-rose-900/30"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>{isDispatching ? 'Connecting Exotel...' : 'Dispatch Automated Phone Alert'}</span>
                </Button>

                {dispatchStatus && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs font-mono text-cyan-300">
                    {dispatchStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="h-full overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {callLogs.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-white">{call.callerId}</span>
                      <Badge
                        variant={call.extractedData?.urgencyLevel === 'CRITICAL' ? 'critical' : 'warning'}
                        className="text-[9px] font-mono"
                      >
                        {call.extractedData?.urgencyLevel || 'ALERT'}
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-mono uppercase">
                        {call.mode} CALL
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-cyan-400" />
                        {call.extractedData?.location || 'Guwahati Basin'}
                      </span>
                      {call.extractedData?.waterLevelMeters && (
                        <span>• Depth: {call.extractedData.waterLevelMeters}m</span>
                      )}
                    </div>
                    {call.extractedData?.notes && (
                      <p className="mt-1.5 text-[11px] text-slate-300 italic">
                        &quot;{call.extractedData.notes}&quot;
                      </p>
                    )}

                  </div>

                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Duration: {call.duration || 120}s</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      LOGGED & DISPATCHED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
