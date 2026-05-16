import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Save, RefreshCw, Settings, Database, Zap, Plus, Trash2, BookOpen, Wrench, Users, FileCode, Brain, Sliders } from 'lucide-react';

interface SkillConfig {
  name: string;
  label: string;
  enabled: boolean;
  roles: string[];
  description: string;
}

interface CustomTool {
  id: string;
  name: string;
  description: string;
  code: string;
  parameters: string;
  enabled: boolean;
  roles: string[];
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  enabled: boolean;
}

interface RolePrompt {
  role: string;
  prompt: string;
  enabled: boolean;
}

interface Workspace {
  id: string;
  name: string;
}

interface EnhancedAIConfig {
  enabled: boolean;
  defaultProvider: string;
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  maxContextMessages: number;
  usageLimitDaily: number;
  usageLimitMonthly: number;
  showTypingIndicator: boolean;
  streamingEnabled: boolean;
  // Enhanced
  workspace: string;
  workspaces: Workspace[];
  skills: SkillConfig[];
  customTools: CustomTool[];
  knowledgeBase: KnowledgeEntry[];
  rolePrompts: RolePrompt[];
  // Tool config
  maxSearchResults: number;
  maxFeaturedResults: number;
  maxOrderHistory: number;
  enableCartOperations: boolean;
  enableOrderLookup: boolean;
  enableProductSearch: boolean;
}

const DEFAULT_SKILLS: SkillConfig[] = [
  { name: 'search_products', label: 'Product Search', enabled: true, roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'], description: 'Search products by name/description' },
  { name: 'get_product', label: 'Product Details', enabled: true, roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'], description: 'Get full product information' },
  { name: 'list_categories', label: 'Category Browser', enabled: true, roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'], description: 'Browse product categories' },
  { name: 'get_cart', label: 'View Cart', enabled: true, roles: ['CUSTOMER'], description: 'View current cart contents' },
  { name: 'add_to_cart', label: 'Add to Cart', enabled: true, roles: ['CUSTOMER'], description: 'Add products to shopping cart' },
  { name: 'get_orders', label: 'Order History', enabled: true, roles: ['CUSTOMER', 'SELLER'], description: 'View order history and status' },
  { name: 'get_featured', label: 'Recommendations', enabled: true, roles: ['CUSTOMER'], description: 'Show featured/hot products' },
  { name: 'get_platform_stats', label: 'Platform Stats', enabled: true, roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'], description: 'Get marketplace statistics' },
];

const DEFAULT_ROLE_PROMPTS: RolePrompt[] = [
  { role: 'CUSTOMER', prompt: 'Focus on product discovery, order tracking, and cart management. Be helpful and guide them through purchases.', enabled: true },
  { role: 'SELLER', prompt: 'Focus on store analytics, product listings, order fulfillment, and seller policies. Provide business insights.', enabled: true },
  { role: 'ADMIN', prompt: 'Focus on platform management, user administration, configuration, and moderation. Provide technical and operational support.', enabled: true },
  { role: 'SUPER_ADMIN', prompt: 'Full platform access insights. Focus on system health, security, configuration, and high-level analytics.', enabled: true },
];

const TOOL_SAMPLES = [
  {
    name: 'calculate_shipping',
    description: 'Estimate shipping cost based on weight and destination',
    code: `// Custom tool: calculate_shipping
// Use this when a user asks about shipping costs
// Returns: { cost, estimatedDays, courier }
async function calculateShipping(args) {
  const { weight, destination, courier } = args;
  const rates = {
    'DHL': { base: 15, perKg: 5, zones: { 'TZ': 3, 'KE': 5, 'UG': 7, 'OTHER': 15 } },
    'FedEx': { base: 12, perKg: 4.5, zones: { 'TZ': 2, 'KE': 4, 'UG': 6, 'OTHER': 12 } },
    'Local': { base: 5, perKg: 2, zones: { 'TZ': 1, 'KE': 3, 'UG': 4, 'OTHER': 8 } },
  };
  const rate = rates[courier] || rates['Local'];
  const days = rate.zones[destination] || rate.zones['OTHER'];
  const cost = rate.base + (rate.perKg * (weight || 1));
  return { cost: Math.round(cost * 100) / 100, estimatedDays: days, courier: courier || 'Local' };
}`,
    parameters: JSON.stringify({ weight: { type: 'number' }, destination: { type: 'string' }, courier: { type: 'string' } }, null, 2),
    enabled: false,
    roles: ['CUSTOMER', 'SELLER'],
  },
  {
    name: 'get_seller_stats',
    description: 'Get seller dashboard statistics (sales, revenue, top products)',
    code: `// Custom tool: get_seller_stats
// For sellers to check their performance
// Requires: seller role
async function getSellerStats(args) {
  const { period, sellerId } = args;
  // This tool integrates with backend analytics
  const response = await fetch('/api/seller/analytics?period=' + (period || 'month'));
  const data = await response.json();
  return {
    totalSales: data.totalSales || 0,
    totalRevenue: data.totalRevenue || 0,
    totalOrders: data.totalOrders || 0,
    topProducts: (data.topProducts || []).slice(0, 5),
    period: period || 'month',
  };
}`,
    parameters: JSON.stringify({ period: { type: 'string', enum: ['week', 'month', 'year'] }, sellerId: { type: 'string' } }, null, 2),
    enabled: false,
    roles: ['SELLER'],
  },
  {
    name: 'get_support_tickets',
    description: 'Look up support tickets for admin/staff',
    code: `// Custom tool: get_support_tickets
// For admins to check support requests
async function getSupportTickets(args) {
  const { status, limit } = args;
  const response = await fetch('/api/admin/tickets?status=' + (status || 'OPEN') + '&limit=' + (limit || 10));
  const data = await response.json();
  return (data.data || []).map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
  }));
}`,
    parameters: JSON.stringify({ status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] }, limit: { type: 'number' } }, null, 2),
    enabled: false,
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export default function AdminAiConfig() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState<EnhancedAIConfig>({
    enabled: true,
    defaultProvider: '',
    defaultModel: '',
    systemPrompt: 'You are the official AI assistant for MarketPlace, a multi-vendor e-commerce platform.',
    temperature: 0.7,
    maxTokens: 2048,
    maxContextMessages: 50,
    usageLimitDaily: 100,
    usageLimitMonthly: 3000,
    showTypingIndicator: true,
    streamingEnabled: true,
    workspace: 'default',
    workspaces: [{ id: 'default', name: 'Default Workspace' }],
    skills: DEFAULT_SKILLS,
    customTools: [],
    knowledgeBase: [],
    rolePrompts: DEFAULT_ROLE_PROMPTS,
    maxSearchResults: 5,
    maxFeaturedResults: 4,
    maxOrderHistory: 5,
    enableCartOperations: true,
    enableOrderLookup: true,
    enableProductSearch: true,
  });
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (config.defaultProvider) {
      fetchModels(config.defaultProvider);
    }
  }, [config.defaultProvider]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get('/config/ai.chat');
      const responseData = response.data;
      // responseData = { success: true, data: { key: 'ai.chat', value: {...}, ... } }
      if (responseData?.data?.value) {
        const cv = responseData.data.value;
        setConfig(prev => ({
          ...prev,
          ...cv,
          skills: cv.skills || DEFAULT_SKILLS,
          customTools: cv.customTools || [],
          knowledgeBase: cv.knowledgeBase || [],
          rolePrompts: cv.rolePrompts || DEFAULT_ROLE_PROMPTS,
          workspaces: cv.workspaces || [{ id: 'default', name: 'Default Workspace' }],
        }));
      }
    } catch { /* defaults */ }
    finally { setLoading(false); }
  };

  const fetchProviders = async () => {
    try {
      const { data } = await api.get('/ai/providers?limit=50');
      setProviders(data.data || []);
    } catch { /* ignore */ }
  };

  const fetchModels = async (slug: string) => {
    if (!slug) return;
    try {
      const { data } = await api.get(`/ai/providers/${slug}/models`);
      setModels(data.data || []);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/config/ai.chat', { value: config });
      setMessage({ type: 'success', text: 'AI configuration saved successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save' });
    } finally { setSaving(false); }
  };

  const addCustomTool = () => {
    setConfig(prev => ({
      ...prev,
      customTools: [...prev.customTools, {
        id: `tool-${Date.now()}`,
        name: 'new_tool',
        description: '',
        code: '// Write your tool logic here\nasync function myTool(args) {\n  return { result: "Hello from my tool" };\n}',
        parameters: '{}',
        enabled: true,
        roles: ['CUSTOMER'],
      }],
    }));
  };

  const removeCustomTool = (id: string) => {
    setConfig(prev => ({ ...prev, customTools: prev.customTools.filter(t => t.id !== id) }));
  };

  const updateCustomTool = (id: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      customTools: prev.customTools.map(t => t.id === id ? { ...t, [field]: value } : t),
    }));
  };

  const addKnowledge = () => {
    setConfig(prev => ({
      ...prev,
      knowledgeBase: [...prev.knowledgeBase, {
        id: `kb-${Date.now()}`,
        title: '',
        content: '',
        category: 'general',
        enabled: true,
      }],
    }));
  };

  const removeKnowledge = (id: string) => {
    setConfig(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(k => k.id !== id) }));
  };

  const updateKnowledge = (id: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      knowledgeBase: prev.knowledgeBase.map(k => k.id === id ? { ...k, [field]: value } : k),
    }));
  };

  const loadSampleTool = (sample: typeof TOOL_SAMPLES[0]) => {
    setConfig(prev => ({
      ...prev,
      customTools: [...prev.customTools, {
        id: `tool-${Date.now()}`,
        name: sample.name,
        description: sample.description,
        code: sample.code,
        parameters: sample.parameters,
        enabled: false,
        roles: [...sample.roles],
      }],
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'prompts', label: 'Prompts', icon: BookOpen },
    { id: 'skills', label: 'Skills & Tools', icon: Wrench },
    { id: 'knowledge', label: 'Knowledge Base', icon: Brain },
    { id: 'roles', label: 'Role Prompts', icon: Users },
    { id: 'custom-tools', label: 'Custom Tools', icon: FileCode },
    { id: 'limits', label: 'Limits', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-gray-900))' }}>AI Configuration Workspace</h2>
          <p className="mt-1" style={{ color: 'rgb(var(--color-gray-500))' }}>Configure AI behavior, skills, knowledge, and tools for the entire platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchConfig} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`} style={{ backgroundColor: message.type === 'success' ? 'rgb(var(--color-accent-50))' : 'rgb(254 226 226)' }}>
          {message.text}
        </div>
      )}

      {/* Workspace Switcher */}
      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: 'rgb(var(--color-gray-50))', borderColor: 'rgb(var(--color-gray-200))' }}>
        <Database className="w-4 h-4" style={{ color: 'rgb(var(--color-gray-500))' }} />
        <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Workspace:</span>
        <select value={config.workspace} onChange={e => setConfig(prev => ({ ...prev, workspace: e.target.value }))} className="input-field text-sm py-1 max-w-[200px]">
          {config.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button className="btn-secondary btn-sm text-xs" onClick={() => {
          const name = prompt('Workspace name:');
          if (name) setConfig(prev => ({ ...prev, workspaces: [...prev.workspaces, { id: `ws-${Date.now()}`, name }], workspace: `ws-${Date.now()}` }));
        }}><Plus className="w-3 h-3" /> New</button>
      </div>

      {/* Horizontal sticky pill toggle tabs */}
      <div className="sticky z-20" style={{ top: '4rem', paddingTop: '0.25rem', marginTop: '-0.25rem' }}>
        <div
          className="flex flex-nowrap gap-1 overflow-x-auto py-2 px-1 scrollbar-thin"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderBottom: 'none',
          }}
          role="tablist"
          aria-label="AI Configuration sections"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
                style={{
                  backgroundColor: isActive ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-hover))',
                  color: isActive ? 'white' : 'rgb(var(--color-text-muted))',
                  boxShadow: isActive ? '0 1px 3px rgb(0 0 0 / 0.12)' : 'none',
                }}>
                <tab.icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.label.split(' ')[0].length > 6 ? tab.label.split(' ')[0].slice(0,4)+'...' : tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
        <div style={{ height: '1px', backgroundColor: 'rgb(var(--color-divider))' }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: General */}
        {activeTab === 'general' && (
          <>
            <section className="card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
                <Settings className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{ key: 'enabled', label: 'Enable AI Chat', desc: 'Allow users to use AI assistant' },
                   { key: 'showTypingIndicator', label: 'Typing Indicator', desc: 'Show typing animation' },
                   { key: 'streamingEnabled', label: 'Streaming', desc: 'Stream responses in real-time' },
                   { key: 'enableCartOperations', label: 'Cart Operations', desc: 'Allow AI to add/view cart' },
                   { key: 'enableOrderLookup', label: 'Order Lookup', desc: 'Allow AI to check orders' },
                   { key: 'enableProductSearch', label: 'Product Search', desc: 'Allow AI to search products' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-gray-900))' }}>{item.label}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={(config as any)[item.key]} onChange={e => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" style={{ backgroundColor: (config as any)[item.key] ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-gray-200))' }}></div>
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
                <Database className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Model & Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Default AI Provider</label>
                  <select value={config.defaultProvider} onChange={e => {
                    setConfig(prev => ({ ...prev, defaultProvider: e.target.value, defaultModel: '' }));
                    if (e.target.value) fetchModels(e.target.value);
                  }} className="input-field">
                    <option value="">Select a provider</option>
                    {providers.map(p => <option key={p.id} value={p.slug}>{p.name} ({p.provider})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Default Model</label>
                  <select value={config.defaultModel} onChange={e => setConfig(prev => ({ ...prev, defaultModel: e.target.value }))} className="input-field" disabled={!config.defaultProvider}>
                    <option value="">Select model</option>
                    {models.map(m => <option key={m.id} value={m.slug}>{m.name} ({Math.round(m.contextLength / 1024)}k ctx)</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
                <Zap className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Creativity & Context</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Temperature: {config.temperature}</label>
                  <input type="range" min="0" max="2" step="0.1" value={config.temperature} onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Max Tokens</label>
                  <input type="number" min="100" max="4096" value={config.maxTokens} onChange={e => setConfig(prev => ({ ...prev, maxTokens: Number(e.target.value) }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Context Messages</label>
                  <input type="number" min="5" max="100" value={config.maxContextMessages} onChange={e => setConfig(prev => ({ ...prev, maxContextMessages: Number(e.target.value) }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Search Results</label>
                  <input type="number" min="1" max="20" value={config.maxSearchResults} onChange={e => setConfig(prev => ({ ...prev, maxSearchResults: Number(e.target.value) }))} className="input-field" />
                </div>
              </div>
            </section>
          </>
        )}

        {/* Tab: Prompts */}
        {activeTab === 'prompts' && (
          <section className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <BookOpen className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> System Prompt</h3>
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>This is the main instruction the AI follows. It defines personality, capabilities, and behavior.</p>
            <textarea value={config.systemPrompt} onChange={e => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="input-field font-mono text-sm" rows={12}
              style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}
            />
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>
              <strong>Tips:</strong> Include platform description, tone guidelines, feature list, and behavior rules.
              The tool definitions and role prompts are appended automatically.
            </p>
          </section>
        )}

        {/* Tab: Skills */}
        {activeTab === 'skills' && (
          <section className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <Wrench className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Skills (Built-in Tools)</h3>
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>Toggle individual AI capabilities. Disabled skills won't be available to the AI.</p>
            <div className="space-y-2">
              {config.skills.map((skill, idx) => (
                <div key={skill.name} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-900))' }}>{skill.label}</span>
                      <code className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-gray-100))', color: 'rgb(var(--color-gray-600))' }}>{skill.name}</code>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-gray-500))' }}>{skill.description}</p>
                    <div className="flex gap-1 mt-1">
                      {skill.roles.map(r => <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>{r}</span>)}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input type="checkbox" checked={skill.enabled} onChange={e => {
                      const newSkills = [...config.skills];
                      newSkills[idx] = { ...newSkills[idx], enabled: e.target.checked };
                      setConfig(prev => ({ ...prev, skills: newSkills }));
                    }} className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: skill.enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-gray-200))' }}></div>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab: Knowledge */}
        {activeTab === 'knowledge' && (
          <section className="card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
                <Brain className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Knowledge Base</h3>
              <button type="button" onClick={addKnowledge} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Add Entry</button>
            </div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>Add knowledge entries that the AI can reference. This helps the AI answer questions about your marketplace.</p>
            {config.knowledgeBase.length === 0 && (
              <div className="text-center py-8" style={{ color: 'rgb(var(--color-gray-400))' }}>
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No knowledge entries yet. Add your first one!</p>
              </div>
            )}
            <div className="space-y-3">
              {config.knowledgeBase.map((entry, idx) => (
                <div key={entry.id} className="p-4 rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))', backgroundColor: 'rgb(var(--color-gray-50))' }}>
                  <div className="flex items-center justify-between mb-2">
                    <input value={entry.title} onChange={e => updateKnowledge(entry.id, 'title', e.target.value)}
                      placeholder="Entry title (e.g., Shipping Policy)"
                      className="input-field text-sm font-medium flex-1 mr-2" />
                    <div className="flex items-center gap-2">
                      <select value={entry.category} onChange={e => updateKnowledge(entry.id, 'category', e.target.value)} className="input-field text-xs py-1 w-32">
                        <option value="general">General</option>
                        <option value="policies">Policies</option>
                        <option value="products">Products</option>
                        <option value="shipping">Shipping</option>
                        <option value="payments">Payments</option>
                        <option value="returns">Returns</option>
                      </select>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={entry.enabled} onChange={e => updateKnowledge(entry.id, 'enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-8 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: entry.enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-gray-200))' }}></div>
                      </label>
                      <button type="button" onClick={() => removeKnowledge(entry.id)} className="p-1 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                  <textarea value={entry.content} onChange={e => updateKnowledge(entry.id, 'content', e.target.value)}
                    placeholder="Write the knowledge content here... This will be included in the AI's context."
                    className="input-field font-mono text-xs" rows={4} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab: Role Prompts */}
        {activeTab === 'roles' && (
          <section className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Role-Specific Prompts</h3>
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>Customize AI behavior for each user role. These instructions are injected when the user has that role.</p>
            {config.rolePrompts.map((rp, idx) => (
              <div key={rp.role} className="p-4 rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>{rp.role}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rp.enabled} onChange={e => {
                      const newRp = [...config.rolePrompts];
                      newRp[idx] = { ...newRp[idx], enabled: e.target.checked };
                      setConfig(prev => ({ ...prev, rolePrompts: newRp }));
                    }} className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: rp.enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-gray-200))' }}></div>
                  </label>
                </div>
                <textarea value={rp.prompt} onChange={e => {
                  const newRp = [...config.rolePrompts];
                  newRp[idx] = { ...newRp[idx], prompt: e.target.value };
                  setConfig(prev => ({ ...prev, rolePrompts: newRp }));
                }} className="input-field font-mono text-xs" rows={3} />
              </div>
            ))}
          </section>
        )}

        {/* Tab: Custom Tools */}
        {activeTab === 'custom-tools' && (
          <section className="card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
                <FileCode className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Custom Tools</h3>
              <button type="button" onClick={addCustomTool} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> New Tool</button>
            </div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>Write custom JavaScript tools that the AI can execute. Each tool is an async function that receives args and returns data.</p>

            {/* Sample Tools */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-primary-700))' }}>Sample Tools (click to import):</p>
              <div className="flex flex-wrap gap-2">
                {TOOL_SAMPLES.map(sample => (
                  <button key={sample.name} type="button" onClick={() => loadSampleTool(sample)}
                    className="text-xs px-2 py-1 rounded border transition-colors"
                    style={{ borderColor: 'rgb(var(--color-primary-200))', color: 'rgb(var(--color-primary-700))', backgroundColor: 'rgb(var(--color-white))' }}>
                    <Plus className="w-3 h-3 inline mr-1" />{sample.name}
                  </button>
                ))}
              </div>
            </div>

            {config.customTools.length === 0 && (
              <div className="text-center py-8" style={{ color: 'rgb(var(--color-gray-400))' }}>
                <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom tools yet. Click "New Tool" or import a sample.</p>
              </div>
            )}

            <div className="space-y-4">
              {config.customTools.map(tool => (
                <div key={tool.id} className="p-4 rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
                  <div className="flex items-center justify-between mb-2">
                    <input value={tool.name} onChange={e => updateCustomTool(tool.id, 'name', e.target.value)}
                      placeholder="tool_name" className="input-field text-sm font-mono w-48" />
                    <div className="flex items-center gap-2">
                      <select value={JSON.stringify(tool.roles)} onChange={e => updateCustomTool(tool.id, 'roles', JSON.parse(e.target.value))}
                        className="input-field text-xs py-1" multiple>
                        {['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                          <option key={r} value={r} selected={tool.roles.includes(r)}>{r}</option>
                        ))}
                      </select>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={tool.enabled} onChange={e => updateCustomTool(tool.id, 'enabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-8 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: tool.enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-gray-200))' }}></div>
                      </label>
                      <button type="button" onClick={() => removeCustomTool(tool.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                  <input value={tool.description} onChange={e => updateCustomTool(tool.id, 'description', e.target.value)}
                    placeholder="Describe what this tool does..." className="input-field text-xs mb-2" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-gray-600))' }}>Code (async function):</p>
                      <textarea value={tool.code} onChange={e => updateCustomTool(tool.id, 'code', e.target.value)}
                        className="input-field font-mono text-xs" rows={6}
                        style={{ backgroundColor: 'rgb(var(--color-gray-900))', color: 'rgb(var(--color-gray-100))' }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-gray-600))' }}>Parameters Schema:</p>
                      <textarea value={tool.parameters} onChange={e => updateCustomTool(tool.id, 'parameters', e.target.value)}
                        className="input-field font-mono text-xs" rows={6}
                        style={{ backgroundColor: 'rgb(var(--color-gray-50))' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab: Limits */}
        {activeTab === 'limits' && (
          <section className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <Sliders className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Usage Limits & Restrictions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Daily Limit per User</label>
                <input type="number" min="0" value={config.usageLimitDaily} onChange={e => setConfig(prev => ({ ...prev, usageLimitDaily: Number(e.target.value) }))} className="input-field" />
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-gray-500))' }}>0 = unlimited</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Monthly Limit per User</label>
                <input type="number" min="0" value={config.usageLimitMonthly} onChange={e => setConfig(prev => ({ ...prev, usageLimitMonthly: Number(e.target.value) }))} className="input-field" />
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-gray-500))' }}>0 = unlimited</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Max Search Results</label>
                <input type="number" min="1" max="20" value={config.maxSearchResults} onChange={e => setConfig(prev => ({ ...prev, maxSearchResults: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Max Featured Products</label>
                <input type="number" min="1" max="20" value={config.maxFeaturedResults} onChange={e => setConfig(prev => ({ ...prev, maxFeaturedResults: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Max Order History</label>
                <input type="number" min="1" max="50" value={config.maxOrderHistory} onChange={e => setConfig(prev => ({ ...prev, maxOrderHistory: Number(e.target.value) }))} className="input-field" />
              </div>
            </div>
          </section>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Configuration</>}
          </button>
        </div>
      </form>
    </div>
  );
}