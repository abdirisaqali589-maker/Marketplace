import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Database, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Shield,
  Clock,
  Hash,
  Layers,
  Cpu,
  Globe,
  Key,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ─────────────────────────────────────────────────────────

interface AiProvider {
  id: string;
  name: string;
  slug: string;
  provider: string;
  baseUrl: string | null;
  apiKey?: string;
  models: string[];
  config: Record<string, any> | null;
  isEnabled: boolean;
  aiModels?: AiModel[];
  createdAt: string;
  updatedAt: string;
  // Added values
  lastTestedAt?: string | null;
  responseTimeMs?: number | null;
  requestCount?: number;
  errorRate?: number;
}

interface AiModel {
  id: string;
  name: string;
  slug: string;
  capabilities: string[];
  contextLength: number;
  isActive: boolean;
  createdAt: string;
  // Added values
  providerName?: string;
  pricing?: { input: number; output: number } | null;
}

interface ProviderStats {
  totalProviders: number;
  activeProviders: number;
  totalModels: number;
  activeModels: number;
  localProviders: number;
  cloudProviders: number;
}

// ─── Components ────────────────────────────────────────────────────

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  subtitle: string; 
  icon: any; 
  color: string 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </motion.div>
);

const ModelDropdown = ({ models, providerName }: { models: AiModel[]; providerName: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!models || models.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <Layers className="w-3.5 h-3.5" />
        <span>{models.length} model{models.length !== 1 ? 's' : ''} available</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{model.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{model.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {model.contextLength > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {(model.contextLength / 1000).toFixed(0)}k
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      model.isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                    }`}>
                      {model.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CapabilityBadge = ({ capability }: { capability: string }) => {
  const colors: Record<string, string> = {
    chat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    vision: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'function-calling': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    embeddings: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    reasoning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  
  const color = colors[capability] || colors.default;
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color}`}>
      {capability}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────

export default function AdminAiProviders() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'providers' | 'models'>('providers');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [testingConn, setTestingConn] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cloud' | 'local'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'date'>('name');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ProviderStats>({
    totalProviders: 0,
    activeProviders: 0,
    totalModels: 0,
    activeModels: 0,
    localProviders: 0,
    cloudProviders: 0,
  });

  const [form, setForm] = useState({
    name: '',
    slug: '',
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    models: '',
    config: '{}',
  });

  // ─── Data Fetching ───────────────────────────────────────────────

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai/providers');
      const providersData = data.data || [];
      setProviders(providersData);
      
      // Calculate stats
      const localTypes = ['ollama', 'lm-studio', 'llamacpp', 'vllm', 'text-gen-webui'];
      setStats({
        totalProviders: providersData.length,
        activeProviders: providersData.filter((p: AiProvider) => p.isEnabled).length,
        totalModels: providersData.reduce((acc: number, p: AiProvider) => acc + (p.aiModels?.length || p.models?.length || 0), 0),
        activeModels: providersData.reduce((acc: number, p: AiProvider) => acc + (p.aiModels?.filter((m: AiModel) => m.isActive).length || 0), 0),
        localProviders: providersData.filter((p: AiProvider) => localTypes.includes(p.provider)).length,
        cloudProviders: providersData.filter((p: AiProvider) => !localTypes.includes(p.provider)).length,
      });
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai/models');
      setModels(data.data || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    if (tab === 'providers') fetchProviders();
    else fetchModels();
  }, [tab, fetchProviders, fetchModels]);

  // ─── Form Handlers ─────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ 
      name: '', 
      slug: '', 
      provider: 'openai', 
      baseUrl: '', 
      apiKey: '', 
      models: '', 
      config: '{}' 
    });
    setEditingId(null);
  };

  const openEdit = (p: AiProvider) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      provider: p.provider,
      baseUrl: p.baseUrl || '',
      apiKey: '',
      models: p.models.join(', '),
      config: p.config ? JSON.stringify(p.config, null, 2) : '{}',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        provider: form.provider,
        baseUrl: form.baseUrl || undefined,
        models: form.models ? form.models.split(',').map((m: string) => m.trim()).filter(Boolean) : [],
      };
      if (form.apiKey) payload.apiKey = form.apiKey;
      try { 
        payload.config = JSON.parse(form.config); 
      } catch { 
        payload.config = {}; 
      }

      if (editingId) {
        await api.patch(`/ai/providers/${editingId}`, payload);
      } else {
        await api.post('/ai/providers', payload);
      }
      setShowForm(false);
      resetForm();
      fetchProviders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save provider');
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/ai/providers/${id}/toggle`);
    fetchProviders();
  };

  const handleTestConnection = async (id: string) => {
    setTestingConn(prev => ({ ...prev, [id]: true }));
    try {
      const { data } = await api.post(`/ai/providers/${id}/test`);
      setTestResults(prev => ({ ...prev, [id]: data.data }));
    } catch (err: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [id]: { 
          success: false, 
          message: err.response?.data?.message || 'Test failed' 
        } 
      }));
    } finally {
      setTestingConn(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleFetchModels = async (id: string) => {
    setFetchingModels(prev => ({ ...prev, [id]: true }));
    try {
      const { data } = await api.post(`/ai/providers/${id}/fetch-models`);
      if (data.data.success) {
        setTestResults(prev => ({ 
          ...prev, 
          [id]: { 
            success: true, 
            message: `Fetched ${data.data.count} models` 
          } 
        }));
        fetchProviders();
      } else {
        setTestResults(prev => ({ 
          ...prev, 
          [id]: { 
            success: false, 
            message: data.data.message 
          } 
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [id]: { 
          success: false, 
          message: err.response?.data?.message || 'Fetch failed' 
        } 
      }));
    } finally {
      setFetchingModels(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleProviderExpand = (id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Helpers ───────────────────────────────────────────────────────

  const providerTypeOptions = [
    { value: 'openai', label: 'OpenAI', category: 'cloud' },
    { value: 'anthropic', label: 'Anthropic', category: 'cloud' },
    { value: 'google', label: 'Google AI', category: 'cloud' },
    { value: 'azure', label: 'Azure OpenAI', category: 'cloud' },
    { value: 'ollama', label: 'Ollama (Local)', category: 'local' },
    { value: 'lm-studio', label: 'LM Studio (Local)', category: 'local' },
    { value: 'llamacpp', label: 'llama.cpp (Local)', category: 'local' },
    { value: 'vllm', label: 'vLLM (Local)', category: 'local' },
    { value: 'text-gen-webui', label: 'oobabooga (Local)', category: 'local' },
    { value: 'custom', label: 'Custom OpenAI-compatible', category: 'cloud' },
  ];

  const getProviderBaseUrlHint = (provider: string) => {
    const hints: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta',
      azure: 'https://your-resource.openai.azure.com',
      ollama: 'http://localhost:11434/v1',
      'lm-studio': 'http://localhost:1234/v1',
      llamacpp: 'http://localhost:8080/v1',
      vllm: 'http://localhost:8000/v1',
      'text-gen-webui': 'http://localhost:5000/v1',
    };
    return hints[provider] || 'http://localhost:11434/v1';
  };

  const isLocalProvider = (provider: string) => {
    const localTypes = ['ollama', 'lm-studio', 'llamacpp', 'vllm', 'text-gen-webui'];
    return localTypes.includes(provider);
  };

  const getProviderIcon = (provider: string) => {
    if (isLocalProvider(provider)) return Cpu;
    return Globe;
  };

  // ─── Filtering & Sorting ───────────────────────────────────────────

  const filteredProviders = providers
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' ? true : 
                         filterType === 'local' ? isLocalProvider(p.provider) : 
                         !isLocalProvider(p.provider);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'status': return (b.isEnabled ? 1 : 0) - (a.isEnabled ? 1 : 0);
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return 0;
      }
    });

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            AI Provider Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Configure AI providers, test connections, and manage models across your infrastructure
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setTab('providers')} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'providers' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Providers
            </button>
            <button 
              onClick={() => setTab('models')} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'models' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Models
            </button>
          </div>
          
          {tab === 'providers' && (
            <button 
              onClick={() => { resetForm(); setShowForm(!showForm); }} 
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              {showForm ? 'Cancel' : 'Add Provider'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {tab === 'providers' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Providers" 
            value={stats.totalProviders} 
            subtitle={`${stats.activeProviders} active`} 
            icon={Database} 
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
          />
          <StatCard 
            title="Active Models" 
            value={stats.activeModels} 
            subtitle={`${stats.totalModels} total configured`} 
            icon={Layers} 
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
          />
          <StatCard 
            title="Cloud Providers" 
            value={stats.cloudProviders} 
            subtitle="External API services" 
            icon={Globe} 
            color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" 
          />
          <StatCard 
            title="Local Providers" 
            value={stats.localProviders} 
            subtitle="Self-hosted instances" 
            icon={Cpu} 
            color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" 
          />
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Provider' : 'Add AI Provider'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="e.g., Production OpenAI"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={form.slug} 
                  onChange={e => setForm({...form, slug: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="e.g., openai-prod"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Provider Type
                </label>
                <select 
                  value={form.provider} 
                  onChange={e => setForm({...form, provider: e.target.value, baseUrl: getProviderBaseUrlHint(e.target.value)})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  <optgroup label="Cloud Providers">
                    {providerTypeOptions.filter(o => o.category === 'cloud').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Local / Self-Hosted">
                    {providerTypeOptions.filter(o => o.category === 'local').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Base URL <span className="text-red-500">*</span>
                </label>
                <input 
                  type="url" 
                  required 
                  value={form.baseUrl} 
                  onChange={e => setForm({...form, baseUrl: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                  placeholder={getProviderBaseUrlHint(form.provider)}
                />
                <p className="text-[11px] text-slate-400">
                  For local models: {getProviderBaseUrlHint(form.provider)}
                </p>
              </div>
              
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  API Key 
                  {isLocalProvider(form.provider) && (
                    <span className="text-slate-400 font-normal"> (optional for local)</span>
                  )}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    value={form.apiKey} 
                    onChange={e => setForm({...form, apiKey: e.target.value})} 
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder={isLocalProvider(form.provider) ? 'Leave empty for local' : 'sk-...'}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Model IDs <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <input 
                  type="text" 
                  value={form.models} 
                  onChange={e => setForm({...form, models: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="gpt-4, gpt-3.5-turbo, llama3, mistral"
                />
              </div>
              
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Config <span className="text-slate-400 font-normal">(JSON, advanced settings)</span>
                </label>
                <textarea 
                  value={form.config} 
                  onChange={e => setForm({...form, config: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="submit" 
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                {editingId ? 'Update Provider' : 'Add Provider'}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); resetForm(); }} 
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      {tab === 'providers' && !showForm && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-1">
              {(['all', 'cloud', 'local'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterType === type
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setSortBy(prev => prev === 'name' ? 'status' : prev === 'status' ? 'date' : 'name')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-xs font-medium capitalize">{sortBy}</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : tab === 'providers' ? (
        filteredProviders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Zap className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery ? 'No providers match your search' : 'No AI providers configured'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'Add an OpenAI-compatible provider to enable AI features. Supports local models (Ollama, LM Studio) and cloud providers.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map((p, index) => {
              const testResult = testResults[p.id];
              const isExpanded = expandedProviders.has(p.id);
              const ProviderIcon = getProviderIcon(p.provider);
              const local = isLocalProvider(p.provider);
              
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Provider Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`p-2 rounded-lg ${
                            local 
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' 
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            <ProviderIcon className="w-5 h-5" />
                          </div>
                          
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {p.provider}
                              </span>
                              {p.isEnabled ? (
                                <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                  <Wifi className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                  <WifiOff className="w-3 h-3" /> Disabled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* URL & Meta */}
                        {p.baseUrl && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 dark:text-slate-500">
                            <Globe className="w-3 h-3" />
                            <span className="font-mono truncate">{p.baseUrl}</span>
                          </div>
                        )}

                        {/* Test Result */}
                        {testResult && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                              testResult.success 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                          >
                            {testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {testResult.message}
                          </motion.div>
                        )}

                        {/* Quick Model Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {p.models?.slice(0, 4).map((m, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md font-medium">
                              {m}
                            </span>
                          ))}
                          {(p.models?.length || 0) > 4 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1 py-1">
                              +{(p.models?.length || 0) - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleTestConnection(p.id)} 
                          disabled={testingConn[p.id]}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title="Test Connection"
                        >
                          {testingConn[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        </button>
                        
                        <button 
                          onClick={() => handleFetchModels(p.id)} 
                          disabled={fetchingModels[p.id]}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title="Fetch Models"
                        >
                          {fetchingModels[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                        
                        <button 
                          onClick={() => openEdit(p)} 
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <label className="relative inline-flex items-center cursor-pointer ml-1">
                          <input 
                            type="checkbox" 
                            checked={p.isEnabled} 
                            onChange={() => handleToggle(p.id)} 
                            className="sr-only peer" 
                          />
                          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Model Dropdown */}
                  {p.aiModels && p.aiModels.length > 0 && (
                    <div className="px-5 pb-4">
                      <ModelDropdown models={p.aiModels} providerName={p.name} />
                    </div>
                  )}

                  {/* Expandable Details */}
                  <button
                    onClick={() => toggleProviderExpand(p.id)}
                    className="w-full flex items-center justify-center gap-1 py-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {isExpanded ? (
                      <>Less details <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>More details <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-slate-400 dark:text-slate-500 mb-1">Provider ID</p>
                              <p className="font-mono text-slate-700 dark:text-slate-300">{p.id}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-500 mb-1">Slug</p>
                              <p className="font-mono text-slate-700 dark:text-slate-300">{p.slug}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-500 mb-1">Created</p>
                              <p className="text-slate-700 dark:text-slate-300">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-500 mb-1">Updated</p>
                              <p className="text-slate-700 dark:text-slate-300">
                                {new Date(p.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {p.config && Object.keys(p.config).length > 0 && (
                            <div className="mt-3">
                              <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">Config</p>
                              <pre className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400">
                                {JSON.stringify(p.config, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* Models Tab */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Provider</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capabilities</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Context</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {models.map((m, index) => (
                  <motion.tr 
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
                          <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-xs font-mono text-slate-400">{m.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {m.providerName || '-'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {m.capabilities.map((c, i) => (
                          <CapabilityBadge key={i} capability={c} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {(m.contextLength / 1000).toFixed(0)}k tokens
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        m.isActive 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {models.length === 0 && (
            <div className="text-center py-16">
              <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No models configured</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Fetch models from a provider to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}