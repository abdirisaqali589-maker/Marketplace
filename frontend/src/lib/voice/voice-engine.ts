/**
 * Lightweight Voice Engine using the Web Speech API.
 * No external dependencies, no API keys needed.
 * Works in all modern browsers (Chrome, Edge, Safari, Firefox).
 */

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceEngineConfig {
  sttLanguage: string;
  ttsLanguage: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVoice: string;
  continuousListening: boolean;
  autoListen: boolean;
  wakeWordEnabled: boolean;
  wakeWord: string;
  maxSpeechDuration: number; // seconds
  showTranscript: boolean;
  enableVoiceCommands: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: string) => void;
  onWakeWordDetected?: () => void;
  onVoiceCommand?: (command: string, intent?: string) => void;
}

export interface VoiceShortcut {
  command: string;
  action: string;
  description: string;
}

class VoiceEngine {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private state: VoiceState = 'idle';
  private config: VoiceEngineConfig;
  private isListening = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private speechQueue: string[] = [];
  private isSpeaking = false;
  private wakeWordBuffer = '';
  private supported: boolean;

  constructor(config?: Partial<VoiceEngineConfig>) {
    this.config = {
      sttLanguage: 'en-US',
      ttsLanguage: 'en-US',
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVoice: 'default',
      continuousListening: false,
      autoListen: false,
      wakeWordEnabled: false,
      wakeWord: 'hey marketplace',
      maxSpeechDuration: 30,
      showTranscript: true,
      enableVoiceCommands: true,
      ...config,
    };

    this.supported = this.checkSupport();
    
    if (this.supported) {
      this.initRecognition();
    }
  }

  private checkSupport(): boolean {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    return !!SpeechRecognition && !!SpeechSynthesis;
  }

  get isSupported(): boolean {
    return this.supported;
  }

  get currentState(): VoiceState {
    return this.state;
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    this.config.onStateChange?.(newState);
  }

  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.sttLanguage;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim().toLowerCase();

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Wake word detection
      if (this.config.wakeWordEnabled && finalTranscript) {
        this.wakeWordBuffer += finalTranscript;
        if (this.wakeWordBuffer.includes(this.config.wakeWord.toLowerCase())) {
          this.wakeWordBuffer = '';
          this.config.onWakeWordDetected?.();
          return;
        }
        // Keep only last ~30 chars for wake word buffer
        if (this.wakeWordBuffer.length > 60) {
          this.wakeWordBuffer = this.wakeWordBuffer.slice(-30);
        }
      }

      // Process final transcript
      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        this.config.onTranscript?.(text, true);

        // Voice command processing
        if (this.config.enableVoiceCommands) {
          this.processVoiceCommand(text);
        }
      }

      // Show interim results
      if (interimTranscript.trim() && this.config.showTranscript) {
        this.config.onTranscript?.(interimTranscript.trim(), false);
      }

      // Reset silence timer
      if (finalTranscript || interimTranscript) {
        this.resetSilenceTimer();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return; // Expected, handled by silence timer
      if (event.error === 'aborted') return; // User stopped listening
      
      this.config.onError?.(`Speech recognition error: ${event.error}`);
      
      if (event.error === 'not-allowed') {
        this.setState('error');
        this.config.onError?.('Microphone access denied. Please allow microphone access in your browser settings.');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      
      // Auto-restart if continuous or still in listening state
      if (this.config.continuousListening && this.state === 'listening') {
        this.restartTimer = setTimeout(() => {
          this.startListening();
        }, 300);
      }
    };
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    // After 2.5 seconds of silence, stop listening automatically
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && !this.config.continuousListening) {
        this.stopListening();
      }
    }, this.config.maxSpeechDuration * 1000 || 25000);
  }

  /**
   * Process voice commands that match known patterns and shortcuts.
   */
  private processVoiceCommand(text: string) {
    const lower = text.toLowerCase().trim();
    
    // Define known voice commands
    const voiceCommands: { pattern: RegExp; action: string; description: string; extract?: string[] }[] = [
      { pattern: /^search\s+(?:for\s+)?(.+)/i, action: 'search_products', description: 'Search products', extract: ['query'] },
      { pattern: /^(?:find|look\s+for|show\s+me)\s+(.+)/i, action: 'search_products', description: 'Find products', extract: ['query'] },
      { pattern: /^(?:add|put)\s+(.+)\s+(?:to|in)\s+(?:my\s+)?(?:cart|basket|bag)/i, action: 'add_to_cart', description: 'Add to cart', extract: ['product'] },
      { pattern: /^(?:show|view|open)\s+(?:my\s+)?(?:orders?|purchases)/i, action: 'show_orders', description: 'Show orders' },
      { pattern: /^(?:show|view|open)\s+(?:my\s+)?(?:cart|basket|bag)/i, action: 'show_cart', description: 'Show cart' },
      { pattern: /^(?:show|view|open)\s+(?:my\s+)?(?:wishlist|favorites|saved)/i, action: 'show_wishlist', description: 'Show wishlist' },
      { pattern: /^help(?:\s+me)?(?:\s+with)?/i, action: 'show_help', description: 'Show help' },
      { pattern: /^(?:go\s+to|open|navigate\s+to)\s+(.+)/i, action: 'navigate', description: 'Navigate to page', extract: ['page'] },
      { pattern: /^(?:track|status\s+of)\s+(?:my\s+)?order\s*(.+)?/i, action: 'track_order', description: 'Track order' },
      { pattern: /^(?:return|refund|exchange)\s+(.+)/i, action: 'return_request', description: 'Return/refund' },
      { pattern: /^how\s+(?:do\s+I|can\s+I|to)\s+(.+)/i, action: 'help', description: 'How-to question' },
      { pattern: /^(?:hello|hi|hey|good\s+(?:morning|afternoon|evening))/i, action: 'greeting', description: 'Greeting' },
      { pattern: /^(?:thanks|thank\s+you|appreciate\s+it)/i, action: 'thanks', description: 'Thank you' },
      { pattern: /^(?:bye|goodbye|see\s+you)/i, action: 'goodbye', description: 'Goodbye' },
      { pattern: /^(?:admin|dashboard|manage)\s+(.+)/i, action: 'admin', description: 'Admin action', extract: ['action'] },
    ];

    for (const cmd of voiceCommands) {
      const match = lower.match(cmd.pattern);
      if (match) {
        const extracted: Record<string, string> = {};
        if (cmd.extract && match[1]) {
          cmd.extract.forEach((key, i) => {
            extracted[key] = match[i + 1] || '';
          });
        }
        this.config.onVoiceCommand?.(cmd.action, extracted.query || extracted.product || extracted.page || extracted.action || '');
        return;
      }
    }
  }

  /**
   * Start listening for speech input.
   */
  startListening(): boolean {
    if (!this.recognition || !this.supported) {
      this.config.onError?.('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) return true;

    try {
      this.recognition.lang = this.config.sttLanguage;
      this.recognition.continuous = this.config.continuousListening;
      this.recognition.start();
      this.isListening = true;
      this.setState('listening');
      this.resetSilenceTimer();
      return true;
    } catch (error: any) {
      this.config.onError?.(`Failed to start listening: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop listening for speech input.
   */
  stopListening(): void {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    
    try {
      this.recognition?.stop();
    } catch {
      // Ignore errors on stop
    }
    
    this.isListening = false;
    this.setState('idle');
  }

  /**
   * Toggle listening on/off.
   */
  toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    }
    return this.startListening();
  }

  /**
   * Speak text using the Web Speech API (TTS).
   */
  speak(text: string, options?: { rate?: number; pitch?: number; voice?: string; language?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.supported) {
        this.config.onError?.('Speech synthesis is not supported.');
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Split long text into manageable chunks
      const chunks = this.splitText(text);
      this.speechQueue.push(...chunks);
      
      if (!this.isSpeaking) {
        this.processSpeechQueue(resolve, reject, options);
      } else {
        // Wait for queue to finish
        const checkQueue = setInterval(() => {
          if (!this.isSpeaking && this.speechQueue.length === 0) {
            clearInterval(checkQueue);
            resolve();
          }
        }, 100);
      }
    });
  }

  private splitText(text: string): string[] {
    // Split by sentences, max 200 chars per chunk
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      if (current.length + trimmed.length > 200) {
        if (current) chunks.push(current.trim());
        current = trimmed;
      } else {
        current += ' ' + trimmed;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  private processSpeechQueue(
    finalResolve: () => void,
    finalReject: (error: Error) => void,
    options?: { rate?: number; pitch?: number; voice?: string; language?: string }
  ) {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      this.setState('idle');
      finalResolve();
      return;
    }

    this.isSpeaking = true;
    this.setState('speaking');

    const text = this.speechQueue.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.language || this.config.ttsLanguage;
    utterance.rate = options?.rate || this.config.ttsRate;
    utterance.pitch = options?.pitch || this.config.ttsPitch;

    // Set voice
    if (options?.voice) {
      const voices = window.speechSynthesis.getVoices();
      const found = voices.find(v => v.name === options.voice);
      if (found) utterance.voice = found;
    }

    utterance.onend = () => {
      this.processSpeechQueue(finalResolve, finalReject, options);
    };

    utterance.onerror = (event) => {
      this.config.onError?.(`Speech synthesis error: ${event.error}`);
      this.processSpeechQueue(finalResolve, finalReject, options);
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Cancel any ongoing speech.
   */
  cancelSpeech(): void {
    window.speechSynthesis.cancel();
    this.speechQueue = [];
    this.isSpeaking = false;
    this.setState('idle');
  }

  /**
   * Get available voices for TTS.
   */
  getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices();
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(newConfig: Partial<VoiceEngineConfig>): void {
    const wasListening = this.isListening;
    if (wasListening) this.stopListening();

    this.config = { ...this.config, ...newConfig };

    if (wasListening) {
      setTimeout(() => this.startListening(), 200);
    }
  }

  /**
   * Check if the browser supports voice features.
   */
  static isBrowserSupported(): boolean {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition && !!window.speechSynthesis;
  }

  /**
   * Clean up and destroy the engine.
   */
  destroy(): void {
    this.stopListening();
    this.cancelSpeech();
    this.recognition = null;
    this.synthesis = null;
  }
}

// Singleton instance
let engineInstance: VoiceEngine | null = null;

export function getVoiceEngine(config?: Partial<VoiceEngineConfig>): VoiceEngine {
  if (!engineInstance) {
    engineInstance = new VoiceEngine(config);
  }
  return engineInstance;
}

export function destroyVoiceEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

export { VoiceEngine };
export default VoiceEngine;