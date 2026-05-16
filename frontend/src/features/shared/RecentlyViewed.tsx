import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, X } from 'lucide-react';
import { assetUrl } from '../../lib/assets';

interface RecentItem {
  id: string;
  title: string;
  slug: string;
  image?: string;
  price?: number;
}

const STORAGE_KEY = 'marketplace_recently_viewed';

export function addRecentlyViewed(product: { id: string; title: string; slug: string; image?: string; price?: number }) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter((i) => i.id !== product.id);
    const updated = [{ id: product.id, title: product.title, slug: product.slug, image: product.image, price: product.price }, ...filtered].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  if (!items.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>
          <Eye className="w-3.5 h-3.5 inline mr-1.5" />
          Recently Viewed
        </h2>
        <button
          onClick={() => { localStorage.removeItem(STORAGE_KEY); setItems([]); }}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/products/${item.slug || item.id}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shrink-0 transition-colors hover:border-primary-200"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              {item.image ? (
                <img src={assetUrl(item.image)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>📦</div>
              )}
            </div>
            <div className="min-w-0 max-w-[120px]">
              <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{item.title}</p>
              {item.price && <p className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>{item.price?.toLocaleString()} TZS</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}