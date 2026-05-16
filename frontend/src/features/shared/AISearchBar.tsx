import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Bot, Loader2, Sparkles, ArrowRight, Zap, Package, ShoppingCart, FileText, Users, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api-enhanced';

interface SearchResult {
  type: 'product' | 'page' | 'user' | 'order' | 'suggestion';
  id?: string;
  title: string;
  description?: string;
  url?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

// ── AI Search Result Item ──
function SearchResultItem({ result, onSelect }: { result: SearchResult; onSelect: (result: SearchResult) => void }) {
  const typeStyles: Record<string, { bg: string; color: string }> = {
    product: { bg: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-600))' },
    suggestion: { bg: 'rgb(var(--color-accent-50))', color: 'rgb(var(--color-accent-600))' },
    page: { bg: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-muted))' },
    user: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
    order: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
  };

  const typeIcons: Record<string, React.ReactNode> = {
    product: <Package className="h-4 w-4" />,
    suggestion: <Sparkles className="h-4 w-4" />,
    page: <FileText className="h-4 w-4" />,
    user: <Users className="h-4 w-4" />,
    order: <ShoppingCart className="h-4 w-4" />,
  };

  const styles = typeStyles[result.type] || typeStyles.suggestion;

  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-opacity-80"
      style={{ backgroundColor: 'transparent', borderBottom: '1px solid rgb(var(--color-divider))' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: styles.bg, color: styles.color }}
      >
        {result.icon || typeIcons[result.type] || <Zap className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
            {result.title}
          </span>
          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: styles.bg, color: styles.color }}>
            {result.type}
          </span>
        </div>
        {result.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {result.description}
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--color-text-muted))' }} aria-hidden="true" />
    </button>
  );
}

// ── Command Search Bar ──
export default function AISearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setAiResponse('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setAiResponse('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];

    try {
      // Product suggestions
      const { data: products } = await api.get('/products', { params: { q: searchQuery, limit: 3 } });
      const productList = products?.data || [];
      productList.slice(0, 3).forEach((p: any) => {
        results.push({
          type: 'product',
          id: p.id,
          title: p.title,
          description: `${p.discountPrice || p.basePrice} ${p.currency || 'TZS'} · ${p.seller?.storeName || ''}`,
          url: `/products/${p.slug}`,
          metadata: { price: p.discountPrice || p.basePrice },
        });
      });
    } catch { /* skip product search */ }

    // Add smart suggestions
    if (searchQuery.toLowerCase().includes('order') || searchQuery.toLowerCase().includes('track')) {
      results.push({
        type: 'suggestion',
        title: 'Track my order',
        description: 'View your order history and tracking information',
        url: '/account/orders',
      });
      results.push({
        type: 'suggestion',
        title: `Search orders containing "${searchQuery}"`,
        description: 'Filter through your order history',
      });
    }

    if (searchQuery.toLowerCase().includes('cart') || searchQuery.toLowerCase().includes('buy')) {
      results.push({
        type: 'suggestion',
        title: 'View shopping cart',
        description: 'Check items in your cart and checkout',
        url: '/cart',
      });
    }

    if (searchQuery.toLowerCase().includes('help') || searchQuery.toLowerCase().includes('support')) {
      results.push({
        type: 'suggestion',
        title: 'Contact support',
        description: 'Get help from our support team',
        url: '/tickets',
      });
      results.push({
        type: 'suggestion',
        title: `Ask AI about "${searchQuery}"`,
        description: 'Get instant answers from the AI assistant',
      });
    }

    // If few results, add AI-powered suggestions
    if (results.length < 3) {
      results.push({
        type: 'suggestion',
        title: `Search marketplace for "${searchQuery}"`,
        description: 'Browse all products matching your search',
        url: `/products?q=${encodeURIComponent(searchQuery)}`,
      });
      results.push({
        type: 'suggestion',
        title: `Ask AI about "${searchQuery}"`,
        description: 'Get a detailed answer with AI assistance',
      });
    }

    setResults(results);
    setIsSearching(false);
  }, [api]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      debounceRef.current = setTimeout(() => performSearch(query), 300);
    } else {
      setResults([]);
      setIsSearching(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  const handleSelect = async (result: SearchResult) => {
    if (result.type === 'suggestion' && result.title.startsWith('Ask AI')) {
      setShowAI(true);
      setIsAIResponding(true);
      setAiResponse('');

      try {
        const { data } = await api.post('/ai/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful marketplace assistant. Give concise, useful answers.' },
            { role: 'user', content: query },
          ],
          max_tokens: 500,
        });
        const content = data?.choices?.[0]?.message?.content || 'I found some information that might help. Try rephrasing your question.';
        setAiResponse(content);
      } catch {
        setAiResponse(`I'd be happy to help you with "${query}". Please visit the AI Chat page for a more detailed conversation.`);
      }
      setIsAIResponding(false);
      return;
    }

    if (result.url) {
      setIsOpen(false);
      navigate(result.url);
    }
  };

  const handleAIChatRedirect = () => {
    setIsOpen(false);
    navigate('/account/ai');
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:shadow-sm"
        style={{
          border: '1px solid',
          borderColor: 'rgb(var(--color-border))',
          backgroundColor: 'rgb(var(--color-surface))',
          color: 'rgb(var(--color-text-muted))',
          minWidth: '240px',
        }}
        aria-label="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1 text-left">Search products, orders, help...</span>
        <kbd
          className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-disabled))' }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setIsOpen(false); setAiResponse(''); }} />
          <div
            ref={containerRef}
            className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {/* Search Input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid', borderColor: 'rgb(var(--color-divider))' }}
            >
              {isAIResponding ? (
                <Loader2 className="h-5 w-5 animate-spin shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
              ) : showAI ? (
                <Bot className="h-5 w-5 shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
              ) : (
                <Search className="h-5 w-5 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); if (showAI) { setShowAI(false); setAiResponse(''); } }}
                placeholder={showAI ? 'Ask AI anything...' : 'Search products, orders, pages, or ask AI...'}
                className="flex-1 text-sm bg-transparent border-none outline-none"
                style={{ color: 'rgb(var(--color-text))' }}
                autoFocus
              />
              {query && (
                <button onClick={() => { setQuery(''); setShowAI(false); setAiResponse(''); }} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-4 w-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </button>
              )}
            </div>

            {/* AI Response View */}
            {showAI && aiResponse && (
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div
                  className="p-4 rounded-xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-50) / 0.3)',
                    border: '1px solid',
                    borderColor: 'rgb(var(--color-primary-200))',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary-700))' }}>AI Response</span>
                  </div>
                  <p className="whitespace-pre-wrap" style={{ color: 'rgb(var(--color-text))' }}>{aiResponse}</p>
                  <button
                    onClick={handleAIChatRedirect}
                    className="mt-3 text-xs font-medium flex items-center gap-1 transition-colors"
                    style={{ color: 'rgb(var(--color-primary-600))' }}
                  >
                    Continue in AI Chat <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Response Loading */}
            {showAI && isAIResponding && (
              <div className="p-4">
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>AI is analyzing your question...</span>
                </div>
              </div>
            )}

            {/* Search Results */}
            {!showAI && results.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                  {isSearching ? 'Searching...' : `Results (${results.length})`}
                </div>
                {results.map((result, idx) => (
                  <SearchResultItem key={`${result.type}-${idx}`} result={result} onSelect={handleSelect} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!showAI && query && !isSearching && results.length === 0 && (
              <div className="p-8 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}
                >
                  <Search className="h-5 w-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>No results found</p>
                <p className="text-xs mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Try asking AI for help with "{query}"
                </p>
                <button
                  onClick={() => {
                    setShowAI(true);
                    setIsAIResponding(true);
                    performSearch(query);
                    setTimeout(() => {
                      setAiResponse(`I'd be happy to help you with "${query}". Please visit the AI Chat page for a detailed conversation.`);
                      setIsAIResponding(false);
                    }, 1000);
                  }}
                  className="text-xs font-medium flex items-center gap-1 mx-auto transition-colors"
                  style={{ color: 'rgb(var(--color-primary-600))' }}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ask AI Instead
                </button>
              </div>
            )}

            {/* Initial State */}
            {!query && !showAI && (
              <div className="p-4">
                <p className="text-xs mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>Try searching for:</p>
                <div className="flex flex-wrap gap-2">
                  {['Track my order', 'Find products', 'Return policy', 'Become a seller', 'Shipping info', 'Help'].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-surface-muted))',
                        color: 'rgb(var(--color-text-secondary))',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-muted))'; }}
                    >
                      <Zap className="h-3 w-3 inline mr-1" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2 text-[10px]"
              style={{
                borderTop: '1px solid',
                borderColor: 'rgb(var(--color-divider))',
                color: 'rgb(var(--color-text-disabled))',
              }}
            >
              <span>
                <Bot className="h-3 w-3 inline mr-1" /> AI-powered search
              </span>
              <span className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>↑↓</kbd> Navigate</span>
                <span><kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>Esc</kbd> Close</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
