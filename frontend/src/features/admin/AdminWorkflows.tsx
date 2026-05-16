import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface WorkflowTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  steps: any[];
  triggers: string[];
  isEnabled: boolean;
  createdAt: string;
}

interface WorkflowRun {
  id: string;
  templateId: string;
  template?: { name: string; slug: string };
  status: string;
  trigger: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function AdminWorkflows() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'templates' | 'runs'>('templates');
  const [showCreate, setShowCreate] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', category: 'automation', steps: '', triggers: '' });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/workflow/templates');
      setTemplates(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/workflow/runs');
      setRuns(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'templates') fetchTemplates();
    else fetchRuns();
  }, [tab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedSteps: any[] = [];
      try {
        parsedSteps = JSON.parse(form.steps);
        if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
          alert('Please enter at least one workflow step as a JSON array.');
          return;
        }
      } catch {
        // If not valid JSON, treat the raw text as a single log step
        parsedSteps = [{ type: 'log', config: { message: form.steps } }];
      }
      await api.post('/workflow/templates', {
        ...form,
        steps: parsedSteps,
        triggers: form.triggers ? form.triggers.split(',').map((t: string) => t.trim()) : [],
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', description: '', category: 'automation', steps: '', triggers: '' });
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create template');
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/workflow/templates/${id}/toggle`);
    fetchTemplates();
  };

  const handleRun = async (slug: string) => {
    try {
      const { data } = await api.post(`/workflow/run/${slug}`, { input: {} });
      setRunResult(`Workflow triggered! Run ID: ${data.data.id}. Status: ${data.data.status}`);
      setTimeout(() => setRunResult(null), 5000);
      if (tab === 'runs') fetchRuns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to trigger workflow');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Automation</h2>
          <p className="text-gray-500 mt-1">Create and manage automated workflows with step-by-step execution</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTab('templates')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'templates' ? 'bg-white shadow' : ''}`}>Templates</button>
            <button onClick={() => setTab('runs')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'runs' ? 'bg-white shadow' : ''}`}>Runs</button>
          </div>
          {tab === 'templates' && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
              {showCreate ? 'Cancel' : '+ Create Template'}
            </button>
          )}
        </div>
      </div>

      {runResult && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-4 text-sm">
          {runResult}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create Workflow Template</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input type="text" required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Steps (JSON array)</label>
            <textarea value={form.steps} onChange={e => setForm({...form, steps: e.target.value})} className="input-field font-mono text-xs" rows={4}
              placeholder='[{"type":"log","config":{"message":"Hello world"}}]' />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Triggers (comma-separated)</label>
            <input type="text" value={form.triggers} onChange={e => setForm({...form, triggers: e.target.value})} className="input-field" placeholder="order.created, payment.completed" />
          </div>
          <button type="submit" className="btn-primary">Create Template</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : tab === 'templates' ? (
        templates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">⚡</p>
            <p className="text-lg font-medium">No workflow templates</p>
            <p className="mt-1">Create your first workflow template to automate tasks.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((t) => (
              <div key={t.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{t.name}</h3>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t.category}</span>
                    </div>
                    {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                      <span>{t.steps?.length || 0} steps</span>
                      <span>{t.triggers?.length || 0} triggers</span>
                      <span>Created {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {t.triggers?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.triggers.map((tr, i) => <span key={i} className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">{tr}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => handleRun(t.slug)} 
                       className="btn-primary text-sm px-3 py-1.5"
                       disabled={!t.steps || t.steps.length === 0}
                       title={t.steps?.length === 0 ? "Template has no steps. Add steps to enable running." : "Run workflow now"}
                     >
                       Run Now
                     </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={t.isEnabled} onChange={() => handleToggle(t.id)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg font-medium">No workflow runs yet</p>
              <p className="mt-1">Trigger a workflow to see execution history.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">ID</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Template</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Started</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Completed</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">#{r.id.substring(0, 8)}</td>
                    <td className="px-4 py-3 font-medium">{r.template?.name || r.templateId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        r.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-500 max-w-[200px] truncate">{r.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}