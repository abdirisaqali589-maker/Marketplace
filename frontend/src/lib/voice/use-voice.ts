import { useState, useEffect, useCallback, useRef } from 'react';
import { getVoiceEngine, destroyVoiceEngine, VoiceState, VoiceEngineConfig } from './voice-engine';

export interface UseVoiceOptions {
  autoListen?: boolean;
  continuousListening?: boolean;
  wakeWordEnabled?: boolean;
  wakeWord?: string;
  sttLanguage?: string;
  ttsLanguage?: string;
  ttsRate?: number;
  ttsPitch?: number;
  enableVoiceCommands?: boolean;
  showTranscript?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: string) => void;
  onVoiceCommand?: (command: string, intent?: string) => void;
  onWakeWordDetected?: () => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [volume, setVolume] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && !!window.speechSynthesis);

    // Initialize voice engine with callbacks
    const engine = getVoiceEngine({
      sttLanguage: options.sttLanguage || 'en-US',
      ttsLanguage: options.ttsLanguage || 'en-US',
      ttsRate: options.ttsRate || 1.0,
      ttsPitch: options.ttsPitch || 1.0,
      continuousListening: options.continuousListening || false,
      autoListen: options.autoListen || false,
      wakeWordEnabled: options.wakeWordEnabled || false,
      wakeWord: options.wakeWord || 'hey marketplace',
      showTranscript: options.showTranscript !== false,
      enableVoiceCommands: options.enableVoiceCommands !== false,
      onTranscript: (text: string, isFinal: boolean) => {
        if (isFinal) {
          setTranscript(prev => (prev ? prev + ' ' + text : text));
          setInterimText('');
          optionsRef.current.onTranscript?.(text, true);
        } else {
          setInterimText(text);
          optionsRef.current.onTranscript?.(text, false);
        }
      },
      onStateChange: (newState: VoiceState) => {
        setState(newState);
        optionsRef.current.onStateChange?.(newState);
      },
      onError: (error: string) => {
        optionsRef.current.onError?.(error);
      },
      onVoiceCommand: (command: string, intent?: string) => {
        optionsRef.current.onVoiceCommand?.(command, intent);
      },
      onWakeWordDetected: () => {
        optionsRef.current.onWakeWordDetected?.();
      },
    });

    return () => {
      // Don't destroy on unmount, as it's a singleton
      // But do stop listening
      engine.stopListening();
    };
  }, []); // Intentionally only on mount

  const startListening = useCallback(() => {
    const engine = getVoiceEngine();
    setTranscript('');
    setInterimText('');
    return engine.startListening();
  }, []);

  const stopListening = useCallback(() => {
    const engine = getVoiceEngine();
    engine.stopListening();
  }, []);

  const toggleListening = useCallback(() => {
    const engine = getVoiceEngine();
    if (engine.currentState === 'listening') {
      engine.stopListening();
      return false;
    }
    setTranscript('');
    setInterimText('');
    return engine.startListening();
  }, []);

  const speak = useCallback(async (text: string, options?: { rate?: number; pitch?: number; voice?: string }) => {
    const engine = getVoiceEngine();
    await engine.speak(text, options);
  }, []);

  const cancelSpeech = useCallback(() => {
    const engine = getVoiceEngine();
    engine.cancelSpeech();
  }, []);

  const updateConfig = useCallback((config: Partial<VoiceEngineConfig>) => {
    const engine = getVoiceEngine();
    engine.updateConfig(config);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
  }, []);

  return {
    state,
    transcript,
    interimText,
    volume,
    isSupported,
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    startListening,
    stopListening,
    toggleListening,
    speak,
    cancelSpeech,
    updateConfig,
    clearTranscript,
  };
}

export default useVoice;