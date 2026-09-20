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
  Headphones,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallSession } from '@/lib/voice/types';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';


export const EmergencyVoiceHelplineModal: React.FC = () => {
  const { activeModal, setActiveModal, playTacticalAlertSound, language, setLanguage, t } = useUIContext();

  // Mode: 'voice' | 'telephony' | 'logs'
  const [activeTab, setActiveTab] = useState<'voice' | 'telephony' | 'logs'>('voice');

  // Interactive Voice Hotline state
  const [messages, setMessages] = useState<{
    speaker: 'caller' | 'assistant';
    text: string;
    time: string;
    audioBase64?: string;
    clientAudioUrl?: string;
  }[]>([
    {
      speaker: 'assistant',
      text: 'HYDRO MATRIX Emergency Hotline: Guwahati Bahini-Bharalu Basin Crisis Command. Please state your location and flood situation.',
      time: '00:00',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callId] = useState(`call_${Date.now()}`);

  // Telephony dispatch state
  const [dispatchPhone, setDispatchPhone] = useState('+91 8088347176');
  const [dispatchCallerId, setDispatchCallerId] = useState('');
  const [dispatchLocation, setDispatchLocation] = useState('Anil Nagar (Bharalu Basin - High Risk)');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [dispatchDiagnostic, setDispatchDiagnostic] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [exotelInfo, setExotelInfo] = useState<{
    configured?: boolean;
    details?: {
      hasSid?: boolean;
      hasKey?: boolean;
      hasToken?: boolean;
      hasCallerId?: boolean;
      sidIsApiKeyMismatch?: boolean;
      callerId?: string;
    };
  } | null>(null);

  // Call logs
  const [callLogs, setCallLogs] = useState<CallSession[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);

  // Auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Preload and register speech synthesis voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Pre-prime audio on user interaction to bypass browser autoplay restrictions
  const primeAudioElement = () => {
    try {
      if (!audioRef.current && typeof window !== 'undefined') {
        audioRef.current = new Audio();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.getVoices();
      }
    } catch (e) {
      console.warn('Audio priming note:', e);
    }
  };

  // Convert Base64 MP3 stream into safe Blob Object URL
  const base64ToBlobUrl = (base64: string): string => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('Base64 to blob conversion failed, falling back to data URL:', e);
      return `data:audio/mpeg;base64,${base64}`;
    }
  };

  // Multi-tier audio playback engine:
  // Tier 1: ElevenLabs synthesized MP3 audio (via Blob URL)
  // Tier 2: Direct Google Neural Audio stream via browser HTML5 Audio element
  // Tier 3: Resilient Web Speech API with Chrome pause/resume workaround
  const playAudio = (
    audioBase64?: string,
    textFallback?: string,
    messageIndex?: number,
    clientAudioUrl?: string
  ) => {
    try {
      if (messageIndex !== undefined) {
        setActivePlayingId(messageIndex);
      }
      playTacticalAlertSound('action');

      // 1. If base64 audio is provided by ElevenLabs, play it via Blob URL
      if (audioBase64 && audioBase64.length > 50) {
        if (!audioRef.current && typeof window !== 'undefined') {
          audioRef.current = new Audio();
        }

        if (audioRef.current) {
          audioRef.current.pause();
          const srcUrl = base64ToBlobUrl(audioBase64);
          audioRef.current.src = srcUrl;
          audioRef.current.volume = 1.0;
          setIsPlayingAudio(true);

          audioRef.current.onended = () => {
            setIsPlayingAudio(false);
            setActivePlayingId(null);
          };

          audioRef.current.onerror = (e) => {
            console.warn('ElevenLabs audio playback failed, falling back to Google Neural/Web Speech:', e);
            playWithGoogleNeuralOrSpeech(textFallback, clientAudioUrl);
          };

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Autoplay restricted on ElevenLabs audio:', err);
              playWithGoogleNeuralOrSpeech(textFallback, clientAudioUrl);
            });
          }
          return;
        }
      }

      // 2. Otherwise play via Google Neural Audio or Web Speech
      playWithGoogleNeuralOrSpeech(textFallback, clientAudioUrl);
    } catch (e) {
      console.error('Audio playback exception:', e);
      playWithGoogleNeuralOrSpeech(textFallback, clientAudioUrl);
    }
  };

  const playWithGoogleNeuralOrSpeech = (text?: string, clientAudioUrl?: string) => {
    if (!text || typeof window === 'undefined') {
      setIsPlayingAudio(false);
      setActivePlayingId(null);
      return;
    }

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const sentence = cleanText.split(/[.!?]/)[0]?.slice(0, 180)?.trim() || cleanText.slice(0, 180).trim();
    const ttsUrl = clientAudioUrl || (sentence ? `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-IN&client=tw-ob&q=${encodeURIComponent(sentence)}` : null);

    if (ttsUrl) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.pause();
        audioRef.current.src = ttsUrl;
        audioRef.current.volume = 1.0;
        setIsPlayingAudio(true);

        audioRef.current.onended = () => {
          setIsPlayingAudio(false);
          setActivePlayingId(null);
        };

        audioRef.current.onerror = () => {
          // Fall back to Web Speech API
          speakWithBrowserSynthesis(cleanText);
        };

        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(() => {
            speakWithBrowserSynthesis(cleanText);
          });
        }
        return;
      } catch {
        // Fall back directly to Web Speech API
      }
    }

    speakWithBrowserSynthesis(cleanText);
  };

  const speakWithBrowserSynthesis = (text?: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlayingAudio(false);
      setActivePlayingId(null);
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      if (language === 'hi') {
        utter.lang = 'hi-IN';
      } else if (language === 'bn' || language === 'as') {
        utter.lang = 'bn-IN';
      } else {
        utter.lang = 'en-IN';
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const langPrefix = language === 'hi' ? 'hi' : language === 'bn' || language === 'as' ? 'bn' : 'en';
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith(langPrefix) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('David') || v.name.includes('Jenny') || v.name.includes('Guy'))
        ) || voices.find((v) => v.lang.startsWith(langPrefix)) || voices[0];

        if (preferredVoice) {
          utter.voice = preferredVoice;
        }
      }

      setIsPlayingAudio(true);
      utter.onstart = () => {
        setIsPlayingAudio(true);
      };
      utter.onend = () => {
        setIsPlayingAudio(false);
        setActivePlayingId(null);
      };
      utter.onerror = (e) => {
        console.warn('Web Speech API note:', e);
        setIsPlayingAudio(false);
        setActivePlayingId(null);
      };

      window.speechSynthesis.speak(utter);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.error('Web Speech API error:', err);
      setIsPlayingAudio(false);
      setActivePlayingId(null);
    }
  };

  // Sound check / test speaker function
  const handleTestSoundCheck = () => {
    primeAudioElement();
    playTacticalAlertSound('critical');
    const testText = 'Emergency broadcast system operational. Voice audio is working properly.';
    playAudio(undefined, testText, 999);
  };

  // Load system info on open
  useEffect(() => {
    if (activeModal === 'emergency_helpline') {
      fetch('/api/emergency-helpline')
        .then((res) => res.json())
        .then((data) => {
          if (data.recentCalls) setCallLogs(data.recentCalls);
          if (data.providers?.exotel) {
            setExotelInfo(data.providers.exotel);
            if (data.providers.exotel.details?.callerId) {
              setDispatchCallerId(data.providers.exotel.details.callerId);
            }
          }
        })
        .catch(console.error);
    }
  }, [activeModal]);

  if (activeModal !== 'emergency_helpline') return null;

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isProcessing) return;

    // Immediately prime audio on user click to secure browser autoplay permission
    primeAudioElement();

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
        body: JSON.stringify({ callId, text: textToSend, language }),
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg = {
          speaker: 'assistant' as const,
          text: data.responseText,
          time: timeStr,
          audioBase64: data.audioBase64,
          clientAudioUrl: data.clientAudioUrl,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-play voice response immediately
        playAudio(data.audioBase64, data.responseText, messages.length + 1, data.clientAudioUrl);
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
    setDispatchDiagnostic(null);
    playTacticalAlertSound('critical');

    try {
      const res = await fetch('/api/emergency-helpline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch_phone',
          phone: dispatchPhone,
          location: dispatchLocation,
          callerId: dispatchCallerId.trim() || undefined,
          threatLevel: 'CRITICAL',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchStatus(`Exotel Call Dispatched Successfully! SID: ${data.callId || 'EXO_CONNECTED'}`);
        setDispatchDiagnostic('Exotel is initiating the outbound call. Please answer your incoming call.');
      } else {
        setDispatchStatus(`Telephony notice: ${data.error || 'Outbound call rejected by gateway'}`);
        setDispatchDiagnostic(data.diagnostic || null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown dispatch error';
      setDispatchStatus(`Dispatch error: ${message}`);
      setDispatchDiagnostic(null);
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
      const speechLangMap: Record<string, string> = {
        en: 'en-IN',
        as: 'as-IN',
        hi: 'hi-IN',
        bn: 'bn-IN',
      };
      recognition.lang = speechLangMap[language] || 'en-IN';
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
      <div className="relative flex flex-col h-[690px] max-h-[92vh] w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-md shadow-rose-500/20">
              <PhoneCall className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide text-white">
                  HYDRO MATRIX AI Emergency Calling & Voice Helpline
                </h2>
                <Badge variant="critical" className="text-[10px] font-mono">
                  LIVE 24/7 DISPATCH
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Guwahati Bahini/Bharalu Flood Command • Multilingual Voice & Telephony Engine
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-6 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-slate-300">Gemini Flash Lite</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <Radio className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-slate-300">Groq Whisper</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-300">ElevenLabs & Neural Audio</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="flex items-center gap-1.5 text-slate-400">
              <PhoneCall className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-slate-300">Exotel Telephony</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isPlayingAudio ? (
              <div className="flex items-center gap-2 text-cyan-400 text-[11px] bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-full animate-pulse">
                <div className="flex items-center gap-0.5">
                  <span className="h-3 w-0.5 bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-4 w-0.5 bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2.5 w-0.5 bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="h-3.5 w-0.5 bg-cyan-400 animate-bounce" style={{ animationDelay: '75ms' }} />
                </div>
                <span>TRANSMITTING LIVE VOICE</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleTestSoundCheck}
                className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-cyan-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                title="Click to test your speaker/audio output"
              >
                <Volume2 className="h-3 w-3 text-cyan-400" />
                <span>Test Speaker</span>
              </button>
            )}
          </div>
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
              {/* Multilingual Voice Language Selection Bar */}
              <div className="flex items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 text-xs shadow-inner">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Globe className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="font-bold text-xs">{t('language')} / Multilingual Mode:</span>
                    <span className="hidden sm:inline text-[11px] text-slate-300 ml-1.5">
                      Talk or type in English, Assamese, Hindi, or Bengali
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SUPPORTED_LANGUAGES.map((langOpt) => (
                    <button
                      key={langOpt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(langOpt.code);
                        playTacticalAlertSound('action');
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        language === langOpt.code
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 font-bold'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                      }`}
                      title={`Switch voice conversation to ${langOpt.name}`}
                    >
                      <span>{langOpt.flag}</span>
                      <span>{langOpt.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>

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
                      <span>{m.speaker === 'caller' ? 'CITIZEN / CALLER' : 'HYDRO MATRIX DISPATCHER'}</span>
                      <span>•</span>
                      <span>{m.time}</span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                        m.speaker === 'caller'
                          ? 'bg-cyan-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-none shadow-md'
                      }`}
                    >
                      <p>{m.text}</p>
                      {m.speaker === 'assistant' && (
                        <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => playAudio(m.audioBase64, m.text, idx, m.clientAudioUrl)}
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer group ${
                              activePlayingId === idx && isPlayingAudio
                                ? 'text-amber-400 font-bold animate-pulse'
                                : 'text-cyan-400 hover:text-cyan-300'
                            }`}
                            title="Click to play synthesized voice audio"
                          >
                            <Volume2 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span>
                              {activePlayingId === idx && isPlayingAudio
                                ? '🔊 Broadcasting Audio...'
                                : '🔊 Listen to Voice'}
                            </span>
                          </button>
                        </div>
                      )}
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
                  placeholder={t('reportPlaceholder')}
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
                  t('quickPrompt1'),
                  t('quickPrompt2'),
                  t('quickPrompt3'),
                ].map((txt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(txt)}
                    className="text-[10px] rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-0.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'telephony' && (
            <div className="flex flex-col gap-5 max-w-xl mx-auto py-2">
              {/* Quick Switch to Browser Voice Hotline */}
              <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-blue-950/30 p-3.5 flex items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🎙️</span>
                  <div>
                    <h4 className="text-xs font-bold text-cyan-200">Want to talk to the AI right now?</h4>
                    <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                      The <strong className="text-cyan-400">Interactive Voice Hotline</strong> tab lets you speak directly using your microphone with live speech responses — zero setup needed!
                    </p>
                  </div>
                </div>
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => setActiveTab('voice')}
                  className="shrink-0 text-xs px-3 py-1.5 h-auto font-semibold gap-1.5"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Start Voice Chat</span>
                </Button>
              </div>

              {/* Exotel Outbound Telephony Info Banner */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Outbound Exotel Telephony Dispatch (PSTN)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Trigger automated outbound emergency phone calls via Exotel to warn ward councilors, emergency SDRF boat units, or registered citizens in designated inundation zones.
                </p>
              </div>

              {/* Exotel Configuration Diagnostics Notice */}
              {exotelInfo?.details?.sidIsApiKeyMismatch && (
                <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-3.5 text-xs text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Exotel Configuration Action Needed (Error 403 / 34009)</span>
                  </div>
                  <p className="text-[11px] text-amber-100/90 leading-relaxed">
                    <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-300 font-mono">EXOTEL_SID</code> in <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-300 font-mono">.env.local</code> is currently set to your API Key. In Exotel, your Account SID is your <strong>Account Subdomain / Name</strong> (found in your Exotel dashboard URL <code className="text-amber-300 font-mono">my.exotel.com/&lt;account_name&gt;</code> or <strong>Settings &gt; API Settings</strong>).
                  </p>
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Mobile / Phone Number
                  </label>
                  <input
                    type="text"
                    value={dispatchPhone}
                    onChange={(e) => setDispatchPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Note: On Exotel trial accounts, numbers must be pre-whitelisted in Exotel Dashboard &gt; Whitelist.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ExoPhone / Virtual Number (Caller ID)
                  </label>
                  <input
                    type="text"
                    value={dispatchCallerId}
                    onChange={(e) => setDispatchCallerId(e.target.value)}
                    placeholder="e.g. 0804719xxxx (ExoPhone assigned to your account)"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Exotel requires CallerId to be an active ExoPhone (virtual number) leased on your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                  <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs space-y-1.5 font-mono">
                    <div className={dispatchStatus.includes('Successfully') ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {dispatchStatus}
                    </div>
                    {dispatchDiagnostic && (
                      <div className="text-[11px] text-amber-300/90 font-sans border-t border-slate-800 pt-1.5">
                        💡 <strong>Diagnostic:</strong> {dispatchDiagnostic}
                      </div>
                    )}
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
