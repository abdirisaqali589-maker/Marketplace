import { useState, useEffect } from 'react';
import { Plus, Trash2, Power } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';

interface Announcement {
  id: string; title: string; body: string; type: string;
  isActive: boolean; startsAt: string | null; expiresAt: string | null; createdAt: string;
}

export default function AdminAnnouncements() {
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', type: 'INFO' });

  const auth = { Authorization: `Bearer ${accessToken}` };

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements', { headers: auth });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleCreate() {
    if (!form.title || !form.body) { toast.error('Title and body required'); return; }
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) { toast.success('Announcement created'); setShowForm(false); setForm({ title: '', body: '', type: 'INFO' }); fetchAll(); }
    } catch { toast.error('Failed to create'); }
  }

  async function handleToggle(id: string) {
    try {
      const res = await fetch(`/api/announcements/${id}/toggle`, { method: 'PATCH', headers: auth });
      if ((await res.json()).success) { toast.success('Toggled'); fetchAll(); }
    } catch { toast.error('Failed to toggle'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: auth });
      if ((await res.json()).success) { toast.success('Deleted'); fetchAll(); }
    } catch { toast.error('Failed to delete'); }
  }

  const typeBadge = (t: string) => {
    const c: Record<string, string> = { INFO: 'badge-info', WARNING: 'badge-warning', PROMOTION: 'badge-success', MAINTENANCE: 'badge-error' };
    return <span className={c[t] || 'badge-neutral'}>{t}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New'}
        </button>
      </div>
      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Announcement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="select-field">
                <option value="INFO">Info</option><option value="WARNING">Warning</option>
                <option value="PROMOTION">Promotion</option><option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="textarea-field" rows={4} />
          </div>
          <button onClick={handleCreate} className="btn-primary">Create</button>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Schedule</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton h-8 m-2" /></td></tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No announcements</td></tr>
              ) : items.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.title}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{a.body.substring(0, 80)}...</div>
                  </td>
                  <td className="px-4 py-3">{typeBadge(a.type)}</td>
                  <td className="px-4 py-3">
                    <span className={a.isActive ? 'badge-success' : 'badge-error'}>{a.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.startsAt ? new Date(a.startsAt).toLocaleDateString() : 'Immediate'}
                    {a.expiresAt ? ` → ${new Date(a.expiresAt).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(a.id)} className="btn-sm btn-secondary">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="btn-sm btn-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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