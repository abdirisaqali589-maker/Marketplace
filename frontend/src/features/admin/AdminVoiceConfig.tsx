import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Settings, Save, RotateCcw, Ear, Globe, ChevronDown, ChevronUp, Play, Square, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { getVoiceEngine } from '../../lib/voice/voice-engine';

interface VoiceConfig {
  enabled: boolean;
  sttEngine: string;
  ttsEngine: string;
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
  voiceShortcuts: { command: string; action: string; description: string }[];
}

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: true,
  sttEngine: 'browser',
  ttsEngine: 'browser',
  ttsVoice: 'default',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  autoListen: false,
  language: 'en-US',
  wakeWordEnabled: false,
  wakeWord: 'hey marketplace',
  maxSpeechDuration: 30,
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

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'sw-KE', label: 'Kiswahili (Kenya)' },
  { value: 'sw-TZ', label: 'Kiswahili (Tanzania)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'de-DE', label: 'German' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];

const ACTION_TYPES = [
  { value: 'search_products', label: 'Search Products', description: 'Searches for products' },
  { value: 'add_to_cart', label: 'Add to Cart', description: 'Adds a product to cart' },
  { value: 'show_cart', label: 'Show Cart', description: 'Shows the user cart' },
  { value: 'show_orders', label: 'Show Orders', description: 'Shows user orders' },
  { value: 'show_wishlist', label: 'Show Wishlist', description: 'Shows user wishlist' },
  { value: 'navigate', label: 'Navigate', description: 'Navigates to a page' },
  { value: 'show_help', label: 'Show Help', description: 'Shows help information' },
  { value: 'track_order', label: 'Track Order', description: 'Tracks an order' },
  { value: 'return_request', label: 'Return Request', description: 'Initiates a return' },
];

export default function AdminVoiceConfig() {
  const [config, setConfig] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts'>('general');
  const [newShortcut, setNewShortcut] = useState({ command: '', action: '', description: '' });

  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Save to localStorage as a client-side preference
      localStorage.setItem('voiceConfig', JSON.stringify(config));
      getVoiceEngine()?.updateConfig({
        sttLanguage: config.language,
        ttsRate: config.ttsRate,
        ttsPitch: config.ttsPitch,
        continuousListening: config.continuousListening,
        wakeWordEnabled: config.wakeWordEnabled,
        wakeWord: config.wakeWord,
        enableVoiceCommands: config.enableVoiceCommands,
      });
      setOriginalConfig({ ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save voice config:', err);
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const handleTestVoice = useCallback(async () => {
    setTestingVoice(true);
    try {
      const engine = getVoiceEngine();
      if (engine) {
        await engine.speak('Hello! This is a voice test. Your voice settings are working correctly.', {
          rate: config.ttsRate,
          pitch: config.ttsPitch,
        });
      }
    } catch (err) {
      console.error('Voice test failed:', err);
    } finally {
      setTestingVoice(false);
    }
  }, [config.ttsRate, config.ttsPitch]);

  const addShortcut = useCallback(() => {
    if (!newShortcut.command.trim() || !newShortcut.action) return;
    setConfig(prev => ({
      ...prev,
      voiceShortcuts: [...prev.voiceShortcuts, { ...newShortcut, description: newShortcut.description || ACTION_TYPES.find(a => a.value === newShortcut.action)?.description || '' }],
    }));
    setNewShortcut({ command: '', action: '', description: '' });
  }, [newShortcut]);

  const removeShortcut = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      voiceShortcuts: prev.voiceShortcuts.filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-orange-500" />
            Voice & Speech Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure voice input and text-to-speech for the AI assistant. Uses the browser's built-in Web Speech API — no external API keys needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all shadow-sm ${
              saving
                ? 'bg-slate-300 dark:bg-slate-700 cursor-wait'
                : saved
                ? 'bg-emerald-500 text-white'
                : isDirty
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {isDirty ? 'Save Changes' : 'No Changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
        {(['general', 'shortcuts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">General Settings</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Enable Voice */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Voice Features</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Allow users to use microphone-based voice input and text-to-speech
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.enabled} onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {config.enabled && (
              <>
                {/* Language */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Speech Recognition Language
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <select
                      value={config.language}
                      onChange={e => setConfig(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TTS Rate & Pitch */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Speech Rate: {config.ttsRate.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={config.ttsRate}
                      onChange={e => setConfig(prev => ({ ...prev, ttsRate: parseFloat(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.5x Slow</span>
                      <span>2.0x Fast</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Speech Pitch: {config.ttsPitch.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={config.ttsPitch}
                      onChange={e => setConfig(prev => ({ ...prev, ttsPitch: parseFloat(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.5 Low</span>
                      <span>2.0 High</span>
                    </div>
                  </div>
                </div>

                {/* Test Voice */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestVoice}
                    disabled={testingVoice}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    {testingVoice ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Test Voice
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">Hear how the AI voice sounds with current settings</span>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advanced Options</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Continuous Listening</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Keep listening after each voice input (battery impact)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.continuousListening} onChange={e => setConfig(prev => ({ ...prev, continuousListening: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Wake Word Detection</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Activate voice by saying a wake word</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.wakeWordEnabled} onChange={e => setConfig(prev => ({ ...prev, wakeWordEnabled: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  {config.wakeWordEnabled && (
                    <div className="space-y-1.5 pl-6">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Wake Word</label>
                      <input
                        type="text"
                        value={config.wakeWord}
                        onChange={e => setConfig(prev => ({ ...prev, wakeWord: e.target.value }))}
                        className="w-full max-w-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="Hey marketplace"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Show Transcript</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Display a transcript of what was heard</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.showTranscript} onChange={e => setConfig(prev => ({ ...prev, showTranscript: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Voice Commands</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Enable predefined voice shortcuts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.enableVoiceCommands} onChange={e => setConfig(prev => ({ ...prev, enableVoiceCommands: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shortcuts' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Voice Shortcuts</h3>
            </div>
          </div>

          <div className="p-6">
            {/* Add new shortcut */}
            <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Command Phrase (use * for variable)</label>
                <input
                  type="text"
                  value={newShortcut.command}
                  onChange={e => setNewShortcut(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., search for *"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div className="w-48">
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Action</label>
                <select
                  value={newShortcut.action}
                  onChange={e => setNewShortcut(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  <option value="">-- Select action --</option>
                  {ACTION_TYPES.map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newShortcut.description}
                  onChange={e => setNewShortcut(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What this command does"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addShortcut}
                  disabled={!newShortcut.command.trim() || !newShortcut.action}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 rounded-lg text-xs font-medium transition-colors"
                >
                  Add Shortcut
                </button>
              </div>
            </div>

            {/* Existing shortcuts */}
            {config.voiceShortcuts.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No voice shortcuts configured</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {config.voiceShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                        <Mic className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                          &ldquo;{shortcut.command}&rdquo;
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mr-1.5">
                            {ACTION_TYPES.find(a => a.value === shortcut.action)?.label || shortcut.action}
                          </span>
                          {shortcut.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeShortcut(index)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}