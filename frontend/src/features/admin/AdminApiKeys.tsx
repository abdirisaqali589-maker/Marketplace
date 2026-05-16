import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface ApiKey {
  id: string;
  name: string;
  key?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', permissions: '', expiresAt: '' });

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api-keys');
      setKeys(data.data || []);
    } catch (err) {
      console.error('Failed to fetch API keys', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { name: form.name };
      if (form.permissions.trim()) payload.permissions = form.permissions.split(',').map((p: string) => p.trim());
      if (form.expiresAt) payload.expiresAt = form.expiresAt;
      const { data } = await api.post('/api-keys', payload);
      const newKey = data.data;
      alert(`API Key created! Save this key: ${newKey.key}\n\nYou will not be able to see it again.`);
      setShowCreate(false);
      setForm({ name: '', permissions: '', expiresAt: '' });
      fetchKeys();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create API key');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) return;
    try {
      await api.patch(`/api-keys/${id}/revoke`);
      fetchKeys();
    } catch (err) {
      console.error('Failed to revoke API key', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-500 mt-1">Manage API access keys for programmatic access</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ Create API Key'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create New API Key</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="e.g., Production API Key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permissions (comma-separated)</label>
            <input type="text" value={form.permissions} onChange={e => setForm({ ...form, permissions: e.target.value })}
              className="input-field" placeholder="e.g., read:products, write:orders" />
            <p className="text-xs text-gray-400 mt-1">Leave empty for full access. Use * for all permissions.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              className="input-field" />
          </div>
          <button type="submit" className="btn-primary">Generate API Key</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading API keys...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔑</p>
          <p className="text-lg font-medium">No API keys yet</p>
          <p className="mt-1">Create your first API key to enable programmatic access.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Key Preview</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Permissions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {key.key ? key.key.substring(0, 20) + '...' : 'mkp_****'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.permissions?.length > 0 ? key.permissions.map((p, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                      )) : <span className="text-xs text-gray-400">All</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {key.isActive && (
                      <button onClick={() => handleRevoke(key.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}