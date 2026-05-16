import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send, MessageSquarePlus, Trash2, Bot, User, Loader2,
  ArrowLeft, Settings, Zap, ChevronDown, ChevronRight, Brain,
  Sparkles, Clock, Copy, Check
} from 'lucide-react';
import { useChatStore, ChatConversation, ChatMessage } from '../../lib/chat-store';
import { useAuthStore } from '../../lib/auth-store';
import VoiceControl from '../voice/VoiceControl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

// ── Collapsible Thinking Process ──
function ThinkingProcess({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const { isThinkingExpanded, setThinkingExpanded } = useChatStore();

  useEffect(() => {
    setExpanded(isThinkingExpanded);
  }, [isThinkingExpanded]);

  const toggle = () => {
    const newVal = !expanded;
    setExpanded(newVal);
    setThinkingExpanded(newVal);
  };

  return (
    <div
      className="mb-3 rounded-lg overflow-hidden transition-all"
      style={{
        border: '1px solid',
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-surface-muted) / 0.5)',
      }}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        )}
        <Brain className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} aria-hidden="true" />
        <span>Thinking process</span>
        {isStreaming && (
          <span className="flex items-center gap-1 ml-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>active</span>
          </span>
        )}
        <span className="ml-auto opacity-50 text-[10px] flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 max-h-[300px] overflow-y-auto">
          <div
            className="p-3 rounded text-xs leading-relaxed whitespace-pre-wrap font-mono"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text-secondary))',
              border: '1px solid',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {content || (isStreaming ? (
              <span className="flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Analyzing and reasoning...
              </span>
            ) : (
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                No reasoning content available for this response.
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Copy Button ──
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all bg-transparent border-none"
      style={{ color: 'rgb(var(--color-text-muted))' }}
      title="Copy response"
      aria-label="Copy response"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}

// ── Typewriter streaming text ──
function TypewriterText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayed('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex >= text.length) return;
    const timeout = setTimeout(() => {
      setDisplayed(prev => prev + text[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, speed);
    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed]);

  return (
    <span className="whitespace-pre-wrap">
      {displayed}
      {currentIndex < text.length && (
        <span
          className="inline-block w-[3px] h-4 ml-0.5 align-middle animate-pulse"
          style={{ backgroundColor: 'rgb(var(--color-text))' }}
        />
      )}
    </span>
  );
}

// ── Markdown Content ──
function MarkdownContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-sm prose-ul:my-1 prose-li:my-0 prose-code:px-1 prose-code:rounded prose-table:text-xs prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1 prose-a:font-medium leading-relaxed"
      style={
        {
          '--tw-prose-body': 'rgb(var(--color-text-secondary))',
          '--tw-prose-headings': 'rgb(var(--color-text))',
          '--tw-prose-links': 'rgb(var(--color-primary-600))',
          '--tw-prose-bold': 'rgb(var(--color-text))',
          '--tw-prose-code': 'rgb(var(--color-text))',
          '--tw-prose-code-bg': 'rgb(var(--color-surface-hover))',
          '--tw-prose-pre-bg': 'rgb(var(--color-surface-muted))',
          '--tw-prose-quotes': 'rgb(var(--color-text-secondary))',
          '--tw-prose-quote-borders': 'rgb(var(--color-primary-300))',
          '--tw-prose-th-borders': 'rgb(var(--color-border))',
          '--tw-prose-td-borders': 'rgb(var(--color-divider))',
        } as React.CSSProperties
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Suggestion Button ──
function SuggestionButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg text-sm text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        border: '1px solid',
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-surface) / 0.6)',
        color: 'rgb(var(--color-text-secondary))',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))';
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50) / 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface) / 0.6)';
      }}
    >
      <Zap className="h-4 w-4 inline mr-2" style={{ color: 'rgb(var(--color-primary-500))' }} aria-hidden="true" />
      {text}
    </button>
  );
}

// ── Empty State ──
function EmptyState({ setInput }: { setInput: (val: string) => void }) {
  const suggestions = [
    'How do I track my order?',
    'What payment methods do you accept?',
    'How do I become a seller?',
    'What is your return policy?',
    'Show me featured products',
    'Search for electronics',
    'Help me with my cart',
    'View my order history',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-200)))',
        }}
      >
        <Sparkles className="h-12 w-12" style={{ color: 'rgb(var(--color-primary-600))' }} aria-hidden="true" />
      </div>
      <h3 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
        What can I help you with?
      </h3>
      <p className="max-w-md mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
        I'm your AI marketplace assistant. I can search products, manage your cart, track orders, and more!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full">
        {suggestions.map((suggestion, idx) => (
          <SuggestionButton key={idx} text={suggestion} onClick={() => setInput(suggestion)} />
        ))}
      </div>
    </div>
  );
}

// ── Main Chat Page ──
export default function AIChatPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isStreaming,
    error,
    typingText,
    thinkingText,
    streamingMessageId,
    loadConversations,
    createConversation,
    selectConversation,
    sendMessage,
    sendMessageStream,
    deleteConversation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText, thinkingText]);

  const handleNewChat = async () => {
    try {
      await createConversation('New Conversation');
      toast.success('New conversation started');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const content = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (!currentConversationId) {
      try {
        await createConversation('New Conversation');
      } catch (err: any) {
        toast.error(err.message || 'Failed to create conversation');
        return;
      }
    }

    try {
      await sendMessageStream(content);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Archive this conversation?')) {
      await deleteConversation(id);
      toast.success('Conversation archived');
    }
  };

  const currentConv = conversations.find((c: ChatConversation) => c.id === currentConversationId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      {/* Sidebar */}
      <aside
        className="hidden w-72 flex-col md:flex"
        style={{
          borderRight: '1px solid',
          borderColor: 'rgb(var(--color-border))',
          backgroundColor: 'rgb(var(--color-gray-50))',
        }}
        aria-label="Conversation history"
      >
        <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <button onClick={handleNewChat} className="w-full btn-secondary justify-center gap-2">
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((conv: ChatConversation) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectConversation(conv.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-full text-left p-3 rounded-lg transition-all group cursor-pointer focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: currentConversationId === conv.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                  color: currentConversationId === conv.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))',
                  border: currentConversationId === conv.id ? '1px solid' : '1px solid transparent',
                  borderColor: currentConversationId === conv.id ? 'rgb(var(--color-primary-200))' : 'transparent',
                }}
                aria-current={currentConversationId === conv.id ? 'true' : undefined}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title || 'New Conversation'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 transition-opacity bg-transparent border-none"
                    style={{ color: 'rgb(var(--color-danger))' }}
                    title="Archive conversation"
                    aria-label="Archive conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-border))' }}>
          <Link
            to="/account"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Account
          </Link>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header
          className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0"
          style={{
            borderBottom: '1px solid',
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
          }}
        >
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Bot className="h-5 w-5" style={{ color: 'rgb(var(--color-primary-500))' }} aria-hidden="true" />
              Marketplace AI
              {isStreaming && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Streaming
                </span>
              )}
            </h2>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Chat, manage, search, and create reports with tools
            </p>
          </div>
          {currentConv && (
            <button
              onClick={() => navigate('/admin/ai-providers')}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" /> AI Admin
            </button>
          )}
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-6">
          {!currentConversationId ? (
            <EmptyState setInput={setInput} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              {/* During streaming, filter out the streaming placeholder message (shown separately below) */}
              {messages.filter(msg => !(isStreaming && msg.id === streamingMessageId)).map((msg: ChatMessage) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[92%] md:max-w-[86%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{
                          backgroundColor: msg.role === 'user' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-gray-100))',
                          color: msg.role === 'user' ? 'white' : 'rgb(var(--color-gray-700))',
                      }}
                    >
                      {msg.role === 'user' ? <User className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
                    </div>

                    {/* Message Bubble */}
                    <div className="group">
                      {/* Thinking Process */}
                      {msg.role === 'assistant' && msg.thinking && (
                        <ThinkingProcess content={msg.thinking} isStreaming={false} />
                      )}

                      <div
                        className="rounded-2xl px-4 py-3 relative shadow-sm"
                        style={{
                          backgroundColor: msg.role === 'user' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-muted))',
                          color: msg.role === 'user' ? 'white' : 'rgb(var(--color-text))',
                          border: msg.role === 'user' ? 'none' : '1px solid rgb(var(--color-border))',
                          borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="text-sm leading-relaxed">
                            <MarkdownContent content={msg.content} />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <div className="flex items-center gap-2">
                            {msg.model && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                style={{
                                  backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.15)' : 'rgb(var(--color-surface-hover))',
                                  color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'rgb(var(--color-text-muted))',
                                }}
                              >
                                {msg.model}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : 'rgb(var(--color-text-disabled))' }}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {msg.role === 'assistant' && <CopyButton text={msg.content} />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {(isStreaming || typingText) && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm"
                      style={{
                        backgroundColor: 'rgb(var(--color-accent-100))',
                        color: 'rgb(var(--color-accent-600))',
                      }}
                    >
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="group">
                      {/* Streaming thinking */}
                      {thinkingText && (
                        <ThinkingProcess content={thinkingText} isStreaming={true} />
                      )}

                      <div
                        className="rounded-2xl px-5 py-3 shadow-sm"
                        style={{
                          backgroundColor: 'rgb(var(--color-surface-muted))',
                          border: '1px solid',
                          borderColor: 'rgb(var(--color-border))',
                          borderRadius: '18px 18px 18px 4px',
                        }}
                      >
                        {typingText ? (
                          <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                            <TypewriterText text={typingText} speed={8} />
                          </p>
                        ) : (
                          <div
                            className="flex items-center gap-3 text-sm"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            <div className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span>AI is thinking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div
                    className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: 'rgb(var(--color-danger) / 0.15)',
                      color: 'rgb(var(--color-danger))',
                    }}
                    role="alert"
                  >
                    <span>⚠</span> {error}
                    <button
                      onClick={() => handleSend()}
                      className="underline ml-2 font-medium"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentConversationId && (
          <form
            onSubmit={handleSend}
            className="shrink-0 px-3 pb-4 pt-3 md:px-6"
            style={{
              borderTop: '1px solid',
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
            }}
          >
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border p-2 shadow-sm" style={{ borderColor: 'rgb(var(--color-border-strong))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              <VoiceControl
                autoSend
                enabled
                className="shrink-0"
                onVoiceInput={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                onAutoSend={async (text) => {
                  if (isLoading || isStreaming) return;
                  if (!currentConversationId) {
                    try {
                      await createConversation('New Conversation');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to create conversation');
                      return;
                    }
                  }
                  try {
                    await sendMessageStream(text);
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to send voice message');
                  }
                }}
              />
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full resize-none bg-transparent px-1 py-2 pr-12 min-h-[44px] max-h-32 text-sm focus:outline-none"
                  style={{
                    color: 'rgb(var(--color-text))',
                  }}
                  disabled={isLoading || isStreaming}
                  aria-label="Type your message"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isStreaming}
                  className="absolute right-1 bottom-1.5 p-2 rounded-xl transition-colors text-white"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-600))',
                    opacity: (!input.trim() || isLoading || isStreaming) ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim() && !isLoading && !isStreaming)
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))';
                  }}
                  aria-label="Send message"
                >
                  {isLoading || isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
              Press <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}>Enter</kbd> to send,{' '}
              <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}>Shift+Enter</kbd> for new line
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
