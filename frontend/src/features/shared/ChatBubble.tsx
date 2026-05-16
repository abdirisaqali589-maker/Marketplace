import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Loader2, MessageSquarePlus, User, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useChatStore, ChatConversation, ChatMessage } from '../../lib/chat-store';
import { useAuthStore } from '../../lib/auth-store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import VoiceControl from '../voice/VoiceControl';

function TypewriterText({ text, speed = 10 }: { text: string; speed?: number }) {
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
        <span className="inline-block w-1 h-3 ml-0.5 animate-pulse align-middle rounded-sm" style={{ backgroundColor: 'rgb(var(--color-primary-400))' }} />
      )}
    </span>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1.5 prose-headings:text-xs prose-ul:my-0.5 prose-li:my-0 prose-code:px-1 prose-code:py-0.5 prose-code:text-[10px] prose-code:rounded prose-table:text-[10px] prose-th:px-1.5 prose-td:px-1.5 prose-th:py-0.5 prose-td:py-0.5"
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
      title={copied ? 'Copied!' : 'Copy'}
      aria-label={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? (
        <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
      ) : (
        <Copy className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
      )}
    </button>
  );
}

function MessageActions({ content, onRegenerate }: { content: string; onRegenerate?: () => void }) {
  return (
    <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton text={content} />
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1 rounded transition-all hover:bg-black/5 dark:hover:bg-white/10"
          title="Regenerate"
          aria-label="Regenerate response"
        >
          <RotateCcw className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </button>
      )}
      <button
        className="p-1 rounded transition-all hover:bg-black/5 dark:hover:bg-white/10"
        title="Good response"
        aria-label="Thumbs up"
      >
        <ThumbsUp className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </button>
      <button
        className="p-1 rounded transition-all hover:bg-black/5 dark:hover:bg-white/10"
        title="Bad response"
        aria-label="Thumbs down"
      >
        <ThumbsDown className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </button>
    </div>
  );
}

export default function ChatBubble() {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

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
    sendMessageStream,
    deleteConversation,
  } = useChatStore();

  const isTyping = isLoading || !!typingText;

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(e.target as Node) && 
          !(e.target as HTMLElement).closest('[data-chatbubble-trigger]')) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNewChat = useCallback(async () => {
    try {
      await createConversation('New Conversation');
      toast.success('New chat started');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start');
    }
  }, [createConversation]);

  const handleSelectConversation = useCallback(async (id: string) => {
    await selectConversation(id);
  }, [selectConversation]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

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
  }, [input, isTyping, currentConversationId, createConversation, sendMessageStream]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id);
    toast.success('Conversation archived');
  }, [deleteConversation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const currentConv = conversations.find((c: ChatConversation) => c.id === currentConversationId);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        data-chatbubble-trigger
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[9999] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-white ${
          isOpen ? 'rotate-90 scale-110' : 'hover:scale-105'
        }`}
        style={{
          backgroundColor: isOpen ? 'rgb(var(--color-danger))' : 'rgb(var(--color-primary-600))',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {isOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Bot className="w-5 h-5" aria-hidden="true" />}
      </button>

      {/* Unread indicator dot */}
      {!isOpen && conversations.length > 0 && (
        <span
          className="fixed bottom-[56px] right-4 z-[9999] w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: 'rgb(var(--color-danger))' }}
          aria-hidden="true"
        />
      )}

      {/* Chat Popup */}
      <div
        ref={chatRef}
        className={`fixed bottom-20 right-4 z-[9999] w-[320px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-6rem)] rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
        role="dialog"
        aria-label="AI Chat Assistant"
        aria-modal={isOpen}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-700)))',
            borderColor: 'rgb(var(--color-primary-700))',
            color: 'white',
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {showSidebar && currentConversationId ? (
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors shrink-0"
                aria-label="Back to chat"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div className="p-0.5 shrink-0" aria-hidden="true">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs font-semibold truncate">
                {currentConversationId && currentConv
                  ? currentConv.title || 'AI Chat'
                  : 'AI Assistant'}
              </h3>
              <p className="text-[9px] opacity-70">Ask me anything</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
              title="Conversations"
              aria-label="Toggle conversation list"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={handleNewChat}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
              title="New chat"
              aria-label="Start new chat"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
            <aside
              className="w-[120px] shrink-0 flex flex-col overflow-hidden"
              style={{
                borderRight: '1px solid',
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface-muted))',
              }}
              aria-label="Conversation history"
            >
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {conversations.length === 0 ? (
                  <p className="text-[10px] text-center py-3" style={{ color: 'rgb(var(--color-text-disabled))' }}>No chats yet</p>
                ) : (
                  conversations.map((conv: ChatConversation) => (
                    <div
                      key={conv.id}
                      onClick={() => { handleSelectConversation(conv.id); setShowSidebar(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectConversation(conv.id); setShowSidebar(false); } }}
                      role="button"
                      tabIndex={0}
                      className="w-full text-left p-1.5 rounded-md text-[10px] transition-all cursor-pointer truncate"
                      style={{
                        backgroundColor: currentConversationId === conv.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                        color: currentConversationId === conv.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
                      }}
                      aria-current={currentConversationId === conv.id ? 'true' : undefined}
                    >
                      <p className="truncate font-medium leading-tight">{conv.title || 'New Chat'}</p>
                      <p className="text-[9px] opacity-50 truncate mt-0.5">{new Date(conv.updatedAt).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">
              {!currentConversationId ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-200)))' }}>
                    <Bot className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} aria-hidden="true" />
                  </div>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: 'rgb(var(--color-text))' }}>Need help?</h4>
                  <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>Ask about products, orders, or anything</p>
                  <div className="space-y-1.5 w-full max-w-[220px]">
                    {['How do I track my order?', 'What payment methods?', 'How to become a seller?', 'Return policy?'].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(suggestion); setTimeout(() => chatRef.current?.querySelector('textarea')?.focus(), 50); }}
                        className="w-full p-1.5 rounded-lg text-[10px] text-left transition-colors"
                        style={{ border: '1px solid', borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* During streaming, filter out the streaming placeholder message (shown separately below) */}
                  {messages.filter(msg => !(isStreaming && msg.id === streamingMessageId)).map((msg: ChatMessage) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`flex gap-1.5 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-0.5"
                          style={{ backgroundColor: msg.role === 'user' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-accent-100))', color: msg.role === 'user' ? 'white' : 'rgb(var(--color-accent-600))' }}>
                          {msg.role === 'user' ? <User className="w-2.5 h-2.5" aria-hidden="true" /> : <Bot className="w-2.5 h-2.5" aria-hidden="true" />}
                        </div>
                        <div className="flex flex-col">
                          <div className="rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm"
                            style={{
                              backgroundColor: msg.role === 'user' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-muted))',
                              color: msg.role === 'user' ? 'white' : 'rgb(var(--color-text))',
                              border: msg.role === 'user' ? 'none' : `1px solid rgb(var(--color-border))`,
                              borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                            }}>
                            {msg.role === 'user' ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : <MarkdownContent content={msg.content} />}
                            {msg.model && <p className="text-[9px] mt-0.5 opacity-50 text-right">{msg.model}</p>}
                          </div>
                          {msg.role === 'assistant' && <MessageActions content={msg.content} />}
                        </div>
                      </div>
                    </div>
                  ))}

                  {(isTyping || typingText) && (
                    <div className="flex justify-start">
                      <div className="flex gap-1.5 max-w-[90%]">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: 'rgb(var(--color-accent-100))', color: 'rgb(var(--color-accent-600))' }}>
                          <Bot className="w-2.5 h-2.5" aria-hidden="true" />
                        </div>
                        <div className="rounded-lg px-2.5 py-1.5 shadow-sm" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', border: '1px solid', borderColor: 'rgb(var(--color-border))', borderRadius: '10px 10px 10px 2px' }}>
                          {typingText ? (
                            <div className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                              <TypewriterText text={typingText} speed={10} />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />
                              Thinking...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-center">
                      <div className="px-2.5 py-1 rounded-md text-[10px]" style={{ backgroundColor: 'rgb(var(--color-danger) / 0.15)', color: 'rgb(var(--color-danger))' }} role="alert">
                        {error}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-2 shrink-0" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
              <form onSubmit={handleSend} className="flex items-center gap-1.5">
                <VoiceControl autoSend={true} onVoiceInput={(text) => setInput(prev => prev ? prev + ' ' + text : text)} onAutoSend={async (text) => {
                  setInput('');
                  if (!currentConversationId) {
                    try { await createConversation('New Conversation'); setTimeout(async () => { try { await sendMessageStream(text); } catch (err: any) { toast.error(err.message || 'Failed to send'); } }, 200); return; }
                    catch (err: any) { toast.error(err.message || 'Failed to create conversation'); return; }
                  }
                  try { await sendMessageStream(text); } catch (err: any) { toast.error(err.message || 'Failed to send'); }
                }} enabled={true} />
                <div className="relative flex-1">
                  <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; }}}
                    onKeyDown={handleKeyDown} placeholder="Message or use voice..." rows={1} className="w-full resize-none px-3 py-2 pr-10 min-h-[36px] max-h-24 text-[11px] rounded-lg focus:outline-none" disabled={isLoading} aria-label="Type your message"
                    style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text))', border: '1px solid rgb(var(--color-border))' }} />
                  <button type="submit" disabled={!input.trim() || isLoading} className="absolute right-2 bottom-2 p-1 rounded-lg transition-colors text-white"
                    style={{ backgroundColor: 'rgb(var(--color-primary-600))', opacity: (!input.trim() || isLoading) ? 0.4 : 1 }}
                    onMouseEnter={(e) => { if (input.trim() && !isLoading) e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'; }}
                    aria-label="Send message">
                    <Send className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </form>
              <p className="text-[9px] mt-1 text-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                Enter to send · Shift+Enter for new line · Voice supported
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
