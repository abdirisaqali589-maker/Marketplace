import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  author: string | null;
  homepage: string | null;
  scopes: string[];
  webhookUrls: string[];
  isEnabled: boolean;
  isSystem: boolean;
  installedAt: string;
}

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', version: '1.0.0', description: '', author: '', scopes: '', webhookUrls: '' });

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/plugins');
      setPlugins(data.data || []);
    } catch (err) {
      console.error('Failed to fetch plugins', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookEvents = async () => {
    try {
      const { data } = await api.get('/webhook-events?limit=10');
      setWebhookEvents(data.data || []);
    } catch (err) {
      console.error('Failed to fetch webhook events', err);
    }
  };

  useEffect(() => { fetchPlugins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/plugins', {
        ...form,
        scopes: form.scopes ? form.scopes.split(',').map((s: string) => s.trim()) : [],
        webhookUrls: form.webhookUrls ? form.webhookUrls.split(',').map((u: string) => u.trim()) : [],
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', version: '1.0.0', description: '', author: '', scopes: '', webhookUrls: '' });
      fetchPlugins();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create plugin');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/plugins/${id}/toggle`);
      fetchPlugins();
    } catch (err) {
      console.error('Failed to toggle plugin', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Uninstall this plugin?')) return;
    try {
      await api.delete(`/plugins/${id}`);
      fetchPlugins();
    } catch (err) {
      console.error('Failed to delete plugin', err);
    }
  };

  const processWebhooks = async () => {
    try {
      await api.post('/webhook-events/process', { batchSize: 20 });
      alert('Webhook events processed!');
      fetchWebhookEvents();
    } catch (err) {
      console.error('Failed to process webhooks', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plugin Registry</h2>
          <p className="text-gray-500 mt-1">Manage plugins, extensions, and webhook event bus</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowWebhooks(!showWebhooks); if (!showWebhooks) fetchWebhookEvents(); }} className="btn-secondary">
            {showWebhooks ? 'Hide Webhooks' : 'Webhook Events'}
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            {showCreate ? 'Cancel' : '+ Register Plugin'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold">Register New Plugin</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input type="text" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Version</label>
              <input type="text" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Author</label>
              <input type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scopes (comma-separated)</label>
            <input type="text" value={form.scopes} onChange={e => setForm({ ...form, scopes: e.target.value })} className="input-field" placeholder="read:products, write:orders" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Webhook URLs (comma-separated)</label>
            <input type="text" value={form.webhookUrls} onChange={e => setForm({ ...form, webhookUrls: e.target.value })} className="input-field" placeholder="https://example.com/webhook" />
          </div>
          <button type="submit" className="btn-primary">Register Plugin</button>
        </form>
      )}

      {showWebhooks && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Webhook Event Bus</h3>
            <button onClick={processWebhooks} className="btn-secondary text-sm">Process Pending</button>
          </div>
          {webhookEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No webhook events yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 text-xs uppercase text-gray-500">Event Type</th>
                  <th className="text-left px-3 py-2 text-xs uppercase text-gray-500">Source</th>
                  <th className="text-left px-3 py-2 text-xs uppercase text-gray-500">Status</th>
                  <th className="text-left px-3 py-2 text-xs uppercase text-gray-500">Attempts</th>
                  <th className="text-left px-3 py-2 text-xs uppercase text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {webhookEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-sm">{evt.eventType}</td>
                    <td className="px-3 py-2 text-sm">{evt.source}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${evt.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : evt.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">{evt.attempts}/{evt.maxAttempts}</td>
                    <td className="px-3 py-2 text-sm">{new Date(evt.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading plugins...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🧩</p>
          <p className="text-lg font-medium">No plugins registered</p>
          <p className="mt-1">Register your first plugin to extend marketplace functionality.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="card p-5 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">v{plugin.version}</span>
                  {plugin.isSystem && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">System</span>}
                </div>
                {plugin.description && <p className="text-sm text-gray-500 mt-1">{plugin.description}</p>}
                {plugin.author && <p className="text-xs text-gray-400 mt-1">by {plugin.author}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {plugin.scopes.map((scope, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{scope}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={plugin.isEnabled} onChange={() => handleToggle(plugin.id)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                {!plugin.isSystem && (
                  <button onClick={() => handleDelete(plugin.id)} className="text-red-500 hover:text-red-700 text-sm">Uninstall</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}