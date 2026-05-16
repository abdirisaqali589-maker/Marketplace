import { useState, useEffect, useCallback } from 'react';
import { useVoice } from '../../lib/voice/use-voice';
import { Mic, MicOff, Volume2, Loader2, X, AlertTriangle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface VoiceControlProps {
  onVoiceInput?: (text: string) => void;
  onAutoSend?: (text: string) => void; // Called with voice text to auto-send to AI
  onVoiceCommand?: (action: string, intent?: string) => void;
  onSpeakResponse?: boolean;
  autoSend?: boolean; // If true, auto-sends voice input immediately
  enabled?: boolean;
  className?: string;
}

export default function VoiceControl({ onVoiceInput, onAutoSend, onVoiceCommand, onSpeakResponse = false, autoSend = false, enabled = true, className = '' }: VoiceControlProps) {
  const {
    state,
    transcript,
    interimText,
    isSupported,
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    toggleListening,
    speak,
    cancelSpeech,
    clearTranscript,
  } = useVoice({
    sttLanguage: 'en-US',
    continuousListening: false,
    wakeWordEnabled: false,
    showTranscript: true,
    enableVoiceCommands: true,
    onTranscript: (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        const voiceText = text.trim();
        onVoiceInput?.(voiceText);
        // Auto-send: if enabled, send directly to AI without waiting for manual send
        if (autoSend && onAutoSend) {
          clearTranscript();
          setShowTranscript(false);
          onAutoSend(voiceText);
        }
      }
    },
    onVoiceCommand: (action: string, intent?: string) => {
      if (action === 'greeting' || action === 'thanks' || action === 'goodbye') {
        onVoiceCommand?.(action, intent);
        // Handle simple voice commands directly if there's no AI handler
        speak(intent || 'Hello! How can I help you?');
      } else {
        // Forward other commands to parent
        onVoiceCommand?.(action, intent);
      }
    },
    onError: (error) => {
      if (error.includes('not-allowed') || error.includes('denied')) {
        setShowPermissionWarning(true);
      }
    },
  });

  const [showTranscript, setShowTranscript] = useState(false);
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleToggle = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice features are not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    toggleListening();
    setShowTranscript(true);
  }, [isSupported, toggleListening]);

  // Stop voice detection when component unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  if (!enabled) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Permission Warning */}
      <AnimatePresence>
        {showPermissionWarning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-xl border p-3 shadow-lg z-50"
            style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-danger) / 0.35)' }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-[10px]" style={{ color: 'rgb(var(--color-danger))' }}>
                <p className="font-medium mb-0.5">Microphone Access Required</p>
                <p>Please allow microphone access in your browser settings to use voice features.</p>
                <button
                  onClick={() => setShowPermissionWarning(false)}
                  className="mt-1.5 text-xs underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript bubble */}
      <AnimatePresence>
        {showTranscript && (transcript || interimText || isListening) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-2xl shadow-xl p-3 min-w-[240px] max-w-[320px] z-50"
            style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              {isSpeaking && (
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  Speaking...
                </span>
              )}
              {isListening && (
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Listening...
                </span>
              )}
              {state === 'processing' && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </span>
              )}
              <button
                onClick={() => setShowTranscript(false)}
                className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
                aria-label="Hide voice transcript"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Voice command help toggle */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 mb-1"
            >
              <Zap className="w-2.5 h-2.5" />
              Voice commands
              {showHelp ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-2"
                >
                  <div className="rounded-lg p-2 text-[9px] space-y-0.5" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}>
                    <p><strong>Say:</strong> "Search for [product]"</p>
                    <p><strong>Say:</strong> "Add [product] to cart"</p>
                    <p><strong>Say:</strong> "Show my orders"</p>
                    <p><strong>Say:</strong> "Show my cart"</p>
                    <p><strong>Say:</strong> "Go to [page]"</p>
                    <p><strong>Say:</strong> "Help"</p>
                    <p className="mt-1 text-slate-400">For full AI chat, just speak naturally!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-lg p-2 min-h-[32px]" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              {transcript ? (
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>{transcript}</p>
              ) : interimText ? (
                <p className="text-[11px] italic" style={{ color: 'rgb(var(--color-text-muted))' }}>{interimText}...</p>
              ) : (
                <p className="text-[11px]" style={{ color: 'rgb(var(--color-text-disabled))' }}>Say something...</p>
              )}
            </div>

            {transcript && (
              <button
                onClick={clearTranscript}
                className="mt-1.5 text-[9px] text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main toggle button */}
      <button
        onClick={handleToggle}
        disabled={state === 'processing'}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse'
            : isSpeaking
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        } ${!isSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={
          !isSupported
            ? 'Voice not supported'
            : isListening
            ? 'Stop listening'
            : 'Start voice input'
        }
        aria-label={
          isListening ? 'Stop voice input' : 'Start voice input'
        }
      >
        {state === 'processing' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isListening ? (
          <Mic className="w-3.5 h-3.5" />
        ) : isSpeaking ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : (
          <MicOff className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Speaking indicator dot */}
      {isSpeaking && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
      )}
      {isListening && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping" />
      )}
    </div>
  );
}
