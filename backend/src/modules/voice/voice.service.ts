import { logger } from '../../common/logger';

/**
 * Lightweight Text-to-Speech and Speech-to-Text service.
 * Uses the Web Speech API on the client side for STT (no API key needed).
 * For TTS, supports both Web Speech API (client-side) and optional server-side 
 * TTS via local tools like eSpeak, or an external API.
 */

export class VoiceService {
  // ── Server-side TTS (text-to-speech) ──
  // Uses simple phoneme/ssml generation that the client can convert to speech
  // via the Web Speech API. No external dependencies.

  /**
   * Generate SSML (Speech Synthesis Markup Language) from text for client-side use.
   * The client will use the Web Speech API with these SSML hints.
   */
  generateSpeechHints(text: string, options?: { 
    voice?: 'male' | 'female' | 'default'; 
    rate?: number; 
    pitch?: number;
    language?: string;
  }): { ssml: string; text: string; options: { voice: string; rate: number; pitch: number; lang: string } } {
    const voice = options?.voice || 'default';
    const rate = Math.min(Math.max(options?.rate || 1.0, 0.5), 2.0);
    const pitch = Math.min(Math.max(options?.pitch || 1.0, 0.5), 2.0);
    const lang = options?.language || 'en-US';

    return {
      ssml: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
        <voice name="${voice === 'male' ? 'Microsoft David Desktop' : voice === 'female' ? 'Microsoft Zira Desktop' : 'default'}">
          <prosody rate="${rate}x" pitch="${pitch}">${this.escapeSSML(text)}</prosody>
        </voice>
      </speak>`,
      text: text,
      options: { voice, rate, pitch, lang },
    };
  }

  /**
   * Split long text into speakable chunks (max 200 chars each for natural speech).
   */
  splitIntoSentences(text: string): string[] {
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

  /**
   * Convert voice input text to a normalized format for processing.
   * This is called when the client sends STT results to the server.
   */
  async processVoiceInput(transcript: string, language?: string): Promise<{
    normalized: string;
    confidence: number;
    language: string;
    isQuestion: boolean;
    isCommand: boolean;
    intent?: string;
  }> {
    const normalized = transcript.trim();
    const isQuestion = normalized.endsWith('?') || /^(what|how|why|when|where|who|can|could|would|will|do|does|is|are)\b/i.test(normalized);
    const isCommand = /^(show|list|find|search|add|create|delete|update|remove|go|open|close|start|stop|help|tell|give)\b/i.test(normalized);
    
    // Basic intent detection
    let intent: string | undefined;
    const lower = normalized.toLowerCase();
    
    if (/\b(search|find|show|list)\b.*\b(product|item)s?\b/i.test(lower)) intent = 'search_product';
    else if (/\b(add|put)\b.*\b(cart|basket|bag)\b/i.test(lower) || /\b(buy|purchase|order)\b/i.test(lower)) intent = 'add_to_cart';
    else if (/\b(order|track|status)\b.*\b(order|delivery|ship)\b/i.test(lower)) intent = 'track_order';
    else if (/\b(help|support)\b/i.test(lower)) intent = 'help';
    else if (/\b(return|refund)\b/i.test(lower)) intent = 'return';
    else if (/\b(profile|account|setting)\b/i.test(lower)) intent = 'account';
    else if (/\b(wishlist|favorite|save|bookmark)\b/i.test(lower)) intent = 'wishlist';
    else if (/\b(admin|dashboard|manage|config)\b/i.test(lower)) intent = 'admin';
    else if (/\b(greeting|hello|hi|hey)\b/i.test(lower)) intent = 'greeting';

    return {
      normalized,
      confidence: 0.9, // Confidence is determined client-side via Web Speech API
      language: language || 'en-US',
      isQuestion,
      isCommand,
      intent,
    };
  }

  private escapeSSML(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  // ── Admin: Voice Configuration ──

  async getDefaultConfig(): Promise<VoiceConfig> {
    return {
      enabled: true,
      sttEngine: 'browser', // 'browser' | 'whisper' | 'custom'
      ttsEngine: 'browser', // 'browser' | 'elevenlabs' | 'custom'
      ttsVoice: 'default',
      ttsRate: 1.0,
      ttsPitch: 1.0,
      autoListen: false,
      language: 'en-US',
      wakeWordEnabled: false,
      wakeWord: 'hey marketplace',
      maxSpeechDuration: 30, // seconds
      continuousListening: false,
      showTranscript: true,
      enableVoiceCommands: true,
      voiceShortcuts: [
        { command: 'search for *', action: 'search_products', description: 'Search products' },
        { command: 'add to cart *', action: 'add_to_cart', description: 'Add product to cart' },
        { command: 'show my orders', action: 'show_orders', description: 'List orders' },
        { command: 'help', action: 'show_help', description: 'Show help' },
        { command: 'go to *', action: 'navigate', description: 'Navigate to page' },
      ],
    };
  }
}

export interface VoiceConfig {
  enabled: boolean;
  sttEngine: 'browser' | 'whisper' | 'custom';
  ttsEngine: 'browser' | 'elevenlabs' | 'custom';
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  autoListen: boolean;
  language: string;
  wakeWordEnabled: boolean;
  wakeWord: string;
  maxSpeechDuration: number;
  continuousListening: boolean;
  showTranscript: boolean;
  enableVoiceCommands: boolean;
  voiceShortcuts: VoiceShortcut[];
}

export interface VoiceShortcut {
  command: string;
  action: string;
  description: string;
}