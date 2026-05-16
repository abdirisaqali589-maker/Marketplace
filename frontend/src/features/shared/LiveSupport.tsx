import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  { label: 'Track Order', icon: '📦', href: '/account/orders' },
  { label: 'Product Help', icon: '💡', href: '/products' },
  { label: 'Returns', icon: '🔄', href: '/account/orders' },
  { label: 'AI Chat', icon: '🤖', href: '/ai-chat' },
];

export default function LiveSupport() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && 
          !(e.target as HTMLElement).closest('[data-livesupport-trigger]')) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <button
        data-livesupport-trigger
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-32 z-[9997] w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110"
        style={{
          backgroundColor: 'rgb(var(--color-primary-600))',
          color: 'white',
        }}
        aria-label="Get help"
        title="Get help"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-4 z-[9997] w-80 rounded-2xl shadow-2xl border overflow-hidden animate-fade-in"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          {/* Header */}
          <div className="p-4 text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-700)))' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">MarketPlace AI</p>
                <p className="text-xs text-white/70">Here to help you 24/7</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-3 space-y-2">
            <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Sparkles className="w-3 h-3 inline mr-1 text-primary-500" />
              Quick actions
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 p-2 rounded-lg text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 text-xs rounded-full px-3 py-2 border"
                style={{
                  backgroundColor: 'rgb(var(--color-surface-muted))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message.trim()) {
                    window.open('/ai-chat?q=' + encodeURIComponent(message), '_self');
                    setOpen(false);
                  }
                }}
              />
              <Link
                to={`/ai-chat?q=${encodeURIComponent(message)}`}
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
              >
                <Send className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-[10px] text-center pt-1" style={{ color: 'rgb(var(--color-text-disabled))' }}>
              Powered by AI · <Link to="/ai-chat" className="underline" onClick={() => setOpen(false)}>Chat now</Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}