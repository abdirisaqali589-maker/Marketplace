import { useState, useEffect } from 'react';
import { Plus, Power } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  currency: string;
  buyerId: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminGiftCards() {
  const { accessToken } = useAuthStore();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [balanceData, setBalanceData] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: 10000, quantity: 1 });

  async function fetchCards() {
    setLoading(true);
    try {
      const res = await fetch('/api/giftcards', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setCards(json.data);
      }
    } catch { /* admin route may not exist */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCards(); }, [accessToken]);

  async function checkBalance() {
    if (!code.trim()) return;
    try {
      const res = await fetch(`/api/giftcards/balance/${code.trim()}`);
      const json = await res.json();
      if (json.success) setBalanceData(json.data);
      else toast.error(json.message);
    } catch { toast.error('Failed to check balance'); }
  }

  async function handleCreate() {
    try {
      const res = await fetch('/api/giftcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ amount: form.amount, quantity: form.quantity }),
      });
      const json = await res.json();
      if (json.success) { toast.success('Gift card(s) created!'); setShowCreate(false); fetchCards(); }
      else toast.error(json.message);
    } catch { toast.error('Failed to create'); }
  }

  async function handleToggle(id: string) {
    try {
      const card = cards.find((item) => item.id === id);
      const res = await fetch(`/api/giftcards/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ isActive: !card?.isActive }),
      });
      if ((await res.json()).success) { toast.success('Updated'); fetchCards(); }
    } catch { toast.error('Failed to update'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gift Cards</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          <Plus className="w-4 h-4" /> {showCreate ? 'Cancel' : 'Create Gift Card'}
        </button>
      </div>

      {showCreate && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Gift Card(s)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="input-field" min={1000} step={1000} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })}
                className="input-field" min={1} max={100} />
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary">
            Create {form.quantity} card{form.quantity > 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Check Gift Card Balance</label>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field flex-1" placeholder="Enter code (e.g. GC-...)" />
            <button onClick={checkBalance} className="btn-primary">Check</button>
          </div>
          {balanceData && (
            <div className="text-sm space-y-1 mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{balanceData.code}</div>
              <div>Balance: <strong>TZS {balanceData.balance.toLocaleString()}</strong></div>
              <div className={`badge ${balanceData.isActive ? 'badge-success' : 'badge-error'}`}>
                {balanceData.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          )}
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-sm text-gray-500">Total Cards</div>
          <div className="text-2xl font-bold text-gray-900">{cards.length}</div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-sm text-gray-500">Active Cards</div>
          <div className="text-2xl font-bold text-green-600">{cards.filter(c => c.isActive).length}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6}><div className="skeleton h-8 m-2" /></td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No gift cards yet</td></tr>
              ) : cards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{card.code}</td>
                  <td className="px-4 py-3 font-medium">TZS {card.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">TZS {card.balance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={card.isActive ? 'badge-success' : 'badge-error'}>{card.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggle(card.id)} className="btn-sm btn-secondary" title={card.isActive ? 'Deactivate' : 'Activate'}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
