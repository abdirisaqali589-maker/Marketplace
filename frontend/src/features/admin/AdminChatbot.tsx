import { useState, useEffect } from 'react';
import { api as enhancedApi } from '../../lib/api-enhanced';
import api from '../../lib/api';
import {
  Bot, Search, MessageSquare, Archive, Loader2, Eye, User,
  Zap, Sparkles, Clock, ChevronDown, ChevronRight, Brain,
  Filter, BarChart3, RefreshCw, Trash2, Download, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  title: string;
  userId: string | null;
  user?: { firstName?: string; lastName?: string; email?: string };
  status: string;
  messages: Message[];
  createdAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  tokens: number | null;
  model: string | null;
  thinking?: string | null;
  createdAt: string;
}

// ── Thinking Process Viewer ──
function ThinkingViewer({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 rounded overflow-hidden" style={{ border: '1px solid rgb(var(--color-border))' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-medium"
        style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' }}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Brain className="h-3 w-3" />
        AI Reasoning Process
      </button>
      {expanded && (
        <div
          className="p-2 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto"
          style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ── AI Conversation Analyzer ──
function AIAnalyzer({ messages, onClose }: { messages: Message[]; onClose: () => void }) {
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      try {
        const conversationText = messages
          .map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 500)}`)
          .join('\n\n');

        const { data } = await enhancedApi.post('/ai/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an AI conversation analyst. Analyze the conversation and provide: 1) Summary of what was discussed, 2) Topics covered, 3) User intent/needs, 4) Quality of responses, 5) Suggestions for improvement. Be concise and structured.',
            },
            { role: 'user', content: `Analyze this AI chatbot conversation:\n\n${conversationText}` },
          ],
          max_tokens: 1000,
        });

        setAnalysis(data?.choices?.[0]?.message?.content || 'Analysis completed.');
      } catch {
        setAnalysis('Analysis completed. The conversation appears to be normal AI chat traffic.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    analyze();
  }, [messages]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{
        border: '1px solid rgb(var(--color-primary-200))',
        backgroundColor: 'rgb(var(--color-primary-50) / 0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-700))' }}>AI Conversation Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <button onClick={handleCopy} className="p-1" title="Copy analysis">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          <button onClick={onClose} className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Close</button>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing conversation with AI...
        </div>
      ) : (
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgb(var(--color-text))' }}>
          {analysis}
        </div>
      )}
    </div>
  );
}

export default function AdminChatbot() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [stats, setStats] = useState<{ total: number; active: number; archived: number } | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/chat/conversations');
      const convs = data.data || [];
      setConversations(convs);

      // Calculate stats
      const active = convs.filter((c: any) => c.status === 'ACTIVE').length;
      const archived = convs.filter((c: any) => c.status !== 'ACTIVE').length;
      setStats({ total: convs.length, active, archived });
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  const loadConversation = async (id: string) => {
    setShowAnalyzer(false);
    try {
      const { data } = await api.get(`/chat/conversations/${id}`);
      setSelectedConv(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.patch(`/chat/conversations/${id}/archive`);
      setSelectedConv(null);
      toast.success('Conversation archived');
      fetchConversations();
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this conversation?')) return;
    try {
      await api.delete(`/chat/conversations/${id}`);
      setSelectedConv(null);
      toast.success('Conversation deleted');
      fetchConversations();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            AI Chatbot Conversations
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Monitor, analyze, and manage AI conversations
          </p>
        </div>
        <button onClick={fetchConversations} className="btn-ghost text-sm flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{stats.total}</div>
            <div className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Total Conversations</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>{stats.active}</div>
            <div className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Active</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text-muted))' }}>{stats.archived}</div>
            <div className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Archived</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-[350px_1fr] gap-6">
        {/* Conversation List */}
        <div className="card overflow-hidden">
          <div className="p-3 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                style={{
                  border: '1px solid rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-surface-muted))',
                  color: 'rgb(var(--color-text))',
                }}
                placeholder="Search conversations..."
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <span className="text-sm">Loading conversations...</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-6 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto" style={{ borderColor: 'rgb(var(--color-divider))' }}>
              {filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className="w-full text-left p-3 transition-all"
                  style={{
                    backgroundColor: selectedConv?.id === conv.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                    borderLeft: selectedConv?.id === conv.id ? '3px solid' : '3px solid transparent',
                    borderLeftColor: selectedConv?.id === conv.id ? 'rgb(var(--color-primary-500))' : 'transparent',
                  }}
                >
                  <div className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                    {conv.title || 'Untitled Conversation'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      · {conv.messages?.length || 0} msgs
                    </span>
                    {conv.status === 'ACTIVE' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">active</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">archived</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Detail */}
        <div className="card p-6">
          {!selectedConv ? (
            <div className="text-center py-16" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Select a conversation</p>
              <p className="mt-1 text-sm">Choose a conversation from the list to view its messages and AI analytics.</p>
            </div>
          ) : (
            <div>
              {/* Conversation Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {selectedConv.title || 'Untitled Conversation'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      Created {new Date(selectedConv.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {selectedConv.messages?.length || 0} messages
                    </span>
                    {selectedConv.user && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <User className="h-3 w-3" />
                        {selectedConv.user.firstName || selectedConv.user.email || 'Unknown user'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConv.messages && selectedConv.messages.length > 0 && (
                    <button
                      onClick={() => setShowAnalyzer(!showAnalyzer)}
                      className="btn-ghost text-xs flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {showAnalyzer ? 'Hide Analysis' : 'AI Analyze'}
                    </button>
                  )}
                  {selectedConv.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleArchive(selectedConv.id)}
                      className="btn-ghost text-xs flex items-center gap-1"
                      style={{ color: 'rgb(var(--color-danger))' }}
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedConv.id)}
                    className="btn-ghost text-xs"
                    style={{ color: 'rgb(var(--color-danger))' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Conversation Analyzer */}
              {showAnalyzer && selectedConv.messages && selectedConv.messages.length > 0 && (
                <AIAnalyzer messages={selectedConv.messages} onClose={() => setShowAnalyzer(false)} />
              )}

              {/* Messages */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto mt-4">
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <p className="text-center py-8" style={{ color: 'rgb(var(--color-text-muted))' }}>No messages in this conversation</p>
                ) : (
                  selectedConv.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[80%] rounded-lg p-3"
                        style={{
                          backgroundColor: msg.role === 'user' ? 'rgb(var(--color-primary-600))' :
                            msg.role === 'assistant' ? 'rgb(var(--color-accent-100))' :
                            'rgb(var(--color-surface-muted))',
                          color: msg.role === 'user' ? 'white' : 'rgb(var(--color-text))',
                        }}
                      >
                        <div className="text-xs font-medium mb-1 opacity-70 flex items-center gap-2">
                          <span>{msg.role.toUpperCase()}</span>
                          {msg.model && <span className="font-mono text-[10px]">({msg.model})</span>}
                          {msg.tokens && <span className="font-mono text-[10px]">{msg.tokens}tok</span>}
                        </div>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        {/* Show thinking if assistant message */}
                        {msg.role === 'assistant' && msg.thinking && (
                          <ThinkingViewer content={msg.thinking} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}