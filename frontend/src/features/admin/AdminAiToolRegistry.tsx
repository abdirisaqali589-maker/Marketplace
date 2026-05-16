import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Save, RefreshCw, Plus, Trash2, Edit3, Shield, AlertTriangle, ToggleLeft, ToggleRight, FileCode, Search, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';

interface AiTool {
  id: string;
  name: string;
  description: string;
  category: string;
  handlerType: string;
  handlerRef?: string;
  enabled: boolean;
  roles: string[];
  riskLevel: string;
  requiresConfirmation: boolean;
  jsonSchema?: Record<string, any>;
  rateLimit?: Record<string, number>;
  auditLevel: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolPermission {
  id: string;
  toolId: string;
  role: string;
  canExecute: boolean;
  canApprove: boolean;
}

interface AuditLogEntry {
  id: string;
  toolName: string;
  userId?: string;
  userRole?: string;
  arguments?: string;
  result?: string;
  error?: string;
  status: string;
  riskLevel: string;
  approvedBy?: string;
  createdAt: string;
}

const TOOL_CATEGORIES = ['builtin', 'plugin', 'workflow', 'webhook'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const ROLES = ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminAiToolRegistry() {
  const [activeTab, setActiveTab] = useState('tools');
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<AiTool | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // Permission state
  const [selectedToolPermissions, setSelectedToolPermissions] = useState<ToolPermission[]>([]);
  const [selectedToolIdForPerms, setSelectedToolIdForPerms] = useState<string | null>(null);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // New tool form state
  const [newTool, setNewTool] = useState<Partial<AiTool>>({
    name: '',
    description: '',
    category: 'builtin',
    handlerType: 'builtin',
    enabled: true,
    roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'],
    riskLevel: 'low',
    requiresConfirmation: false,
    auditLevel: 'standard',
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai-tools?limit=100');
      if (data?.data) setTools(data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load tools: ' + (err.response?.data?.message || err.message) });
    }
    setLoading(false);
  };

  const fetchPermissions = async (toolId: string) => {
    try {
      const { data } = await api.get(`/ai-tools/${toolId}/permissions`);
      const tool = tools.find(item => item.id === toolId) || null;
      setSelectedTool(tool);
      const permissions = data?.data || [];
      setSelectedToolPermissions(ROLES.map(role => (
        permissions.find((permission: ToolPermission) => permission.role === role) || {
          id: `${toolId}-${role}`,
          toolId,
          role,
          canExecute: tool?.roles?.includes(role) ?? true,
          canApprove: role === 'SUPER_ADMIN',
        }
      )));
      setSelectedToolIdForPerms(toolId);
      setShowPermissionModal(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load permissions' });
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      const { data } = await api.get('/ai-tools/audit-logs', { params: { page, limit: 20 } });
      if (data?.data) setAuditLogs(data.data);
      if (data?.pagination) {
        setAuditTotal(data.pagination.total);
        setAuditPage(page);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load audit logs' });
    }
  };

  const handleCreate = async () => {
    if (!newTool.name || !newTool.description) {
      setMessage({ type: 'error', text: 'Name and description are required' });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/ai-tools', newTool);
      if (data?.success) {
        setMessage({ type: 'success', text: `Tool "${newTool.name}" created successfully` });
        setShowCreateModal(false);
        setNewTool({ name: '', description: '', category: 'builtin', handlerType: 'builtin', enabled: true, roles: ['CUSTOMER'], riskLevel: 'low', requiresConfirmation: false, auditLevel: 'standard' });
        fetchTools();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create tool' });
    }
    setSaving(false);
  };

  const handleToggle = async (tool: AiTool) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/ai-tools/${tool.id}`, {
        ...tool,
        enabled: !tool.enabled,
      });
      if (data?.success) {
        setTools(t => t.map(x => x.id === tool.id ? { ...x, enabled: !tool.enabled } : x));
        setMessage({ type: 'success', text: `Tool "${tool.name}" ${!tool.enabled ? 'enabled' : 'disabled'}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to update tool' });
    }
    setSaving(false);
  };

  const handleDelete = async (toolId: string, name: string) => {
    if (!confirm(`Delete tool "${name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const { data } = await api.delete(`/ai-tools/${toolId}`);
      if (data?.success) {
        setTools(t => t.filter(x => x.id !== toolId));
        setExpandedTools(prev => { prev.delete(toolId); return new Set(prev); });
        setMessage({ type: 'success', text: `Tool "${name}" deleted` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete tool' });
    }
    setSaving(false);
  };

  const handleSavePermission = async () => {
    if (!selectedToolIdForPerms) return;
    setSaving(true);
    try {
      for (const perm of selectedToolPermissions) {
        await api.post(`/ai-tools/${selectedToolIdForPerms}/permissions`, {
          role: perm.role,
          canExecute: perm.canExecute,
          canApprove: perm.canApprove,
        });
      }
      setMessage({ type: 'success', text: 'Permissions updated' });
      setShowPermissionModal(false);
      setSelectedToolPermissions([]);
      setSelectedToolIdForPerms(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to save permissions' });
    }
    setSaving(false);
  };

  const toggleExpand = (toolId: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const riskColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const filteredTools = tools.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterRisk !== 'all' && t.riskLevel !== filterRisk) return false;
    if (filterEnabled !== 'all' && String(t.enabled) !== filterEnabled) return false;
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-gray-900))' }}>AI Tool Registry</h2>
          <p className="mt-1" style={{ color: 'rgb(var(--color-gray-500))' }}>Manage AI tools, permissions, risk levels, and audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Tool
          </button>
          <button onClick={fetchTools} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
          <button className="float-right text-lg" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
        <input
          type="text"
          placeholder="Search tools..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-field text-sm w-64"
          style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}
        />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field text-sm">
          <option value="all">All Categories</option>
          {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="input-field text-sm">
          <option value="all">All Risk Levels</option>
          {RISK_LEVELS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={filterEnabled} onChange={e => setFilterEnabled(e.target.value)} className="input-field text-sm">
          <option value="all">All Status</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      {/* Tools Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
        <table className="min-w-full divide-y" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
          <thead style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Tool Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Handler</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Roles</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Confirmation</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgb(var(--color-gray-600))' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-gray-100))', backgroundColor: 'rgb(var(--color-white))' }}>
            {filteredTools.map(tool => (
              <React.Fragment key={tool.id}>
                <tr className="hover:bg-gray-50" style={{ backgroundColor: 'rgb(var(--color-white))' }}>
                  <td className="px-4 py-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={tool.enabled} onChange={() => handleToggle(tool)} className="sr-only peer" />
                      <div className={`w-8 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${tool.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {expandedTools.has(tool.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <code className="text-sm font-mono font-medium">{tool.name}</code>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>{tool.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      {tool.handlerType === 'builtin' && <FileCode className="w-3.5 h-3.5" />}
                      {tool.handlerType === 'plugin' && <Shield className="w-3.5 h-3.5" />}
                      {tool.handlerType === 'workflow' && <FileCode className="w-3.5 h-3.5" />}
                      {tool.handlerType === 'webhook' && <Shield className="w-3.5 h-3.5" />}
                      <span>{tool.handlerType}</span>
                      {tool.handlerRef && <span className="text-gray-400 text-xs">→ {tool.handlerRef}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[tool.riskLevel]}`}>{tool.riskLevel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(tool.roles || []).map((r: string) => (
                        <span key={r} className="text-[10px] px-1 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {tool.requiresConfirmation ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <span className="text-gray-400 text-xs">auto</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleExpand(tool.id)} className="p-1 rounded hover:bg-gray-100">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-gray-500))' }} />
                      </button>
                      <button onClick={() => fetchPermissions(tool.id)} className="p-1 rounded hover:bg-gray-100">
                        <Shield className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-blue-500))' }} />
                      </button>
                      <button onClick={() => handleDelete(tool.id, tool.name)} className="p-1 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-red-500))' }} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedTools.has(tool.id) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-3" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Description</p>
                          <p style={{ color: 'rgb(var(--color-gray-600))' }}>{tool.description}</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Audit Level</p>
                          <p style={{ color: 'rgb(var(--color-gray-600))' }}>{tool.auditLevel}</p>
                        </div>
                        {tool.rateLimit && (
                          <div>
                            <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Rate Limits</p>
                            <p style={{ color: 'rgb(var(--color-gray-600))' }}>
                              Per Minute: {tool.rateLimit.perMinute || '—'} | Per Hour: {tool.rateLimit.perHour || '—'}
                            </p>
                          </div>
                        )}
                        {tool.jsonSchema && (
                          <div>
                            <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-gray-700))' }}>Parameters Schema</p>
                            <pre className="text-xs p-2 rounded overflow-x-auto" style={{ backgroundColor: 'rgb(var(--color-gray-100))', color: 'rgb(var(--color-gray-700))' }}>
                              {JSON.stringify(tool.jsonSchema, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-2xl w-full mx-4" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-gray-200))' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <Shield className="w-5 h-5 inline mr-2" style={{ color: 'rgb(var(--color-primary-600))' }} />
              Tool Permissions
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-gray-500))' }}>
              Controls which roles can execute or approve this tool.
              {selectedTool?.riskLevel === 'high' || selectedTool?.riskLevel === 'critical' ? (
                <span className="ml-2 text-orange-600 font-medium">⚠ Requires approval for execution</span>
              ) : null}
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ROLES.map(role => {
                const perm = selectedToolPermissions.find(p => p.role === role) || { role, canExecute: true, canApprove: false };
                return (
                  <div key={role} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-gray-900))' }}>{role}</span>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-gray-500))' }}>
                        Execute + {selectedTool?.riskLevel && ['high', 'critical'].includes(selectedTool.riskLevel) ? '(may require approval)' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={perm.canExecute}
                          onChange={e => setSelectedToolPermissions(prev => prev.map(p => p.role === role ? { ...p, canExecute: e.target.checked } : p))}
                          className="rounded"
                        />
                        Execute
                      </label>
                      {(selectedTool?.riskLevel === 'high' || selectedTool?.riskLevel === 'critical') && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={perm.canApprove}
                            onChange={e => setSelectedToolPermissions(prev => prev.map(p => p.role === role ? { ...p, canApprove: e.target.checked } : p))}
                            className="rounded"
                            style={{ accentColor: 'rgb(var(--color-orange-500))' }}
                          />
                          Approve
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowPermissionModal(false); setSelectedToolPermissions([]); }} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgb(var(--color-gray-200))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-gray-700))', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSavePermission} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'rgb(var(--color-primary-600))', color: 'white', cursor: 'pointer' }}>Save Permissions</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-lg w-full mx-4" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-gray-200))', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-gray-900))' }}>
              <Plus className="w-5 h-5 inline mr-2" style={{ color: 'rgb(var(--color-primary-600))' }} />
              Register New AI Tool
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Tool Name *</label>
                <input
                  value={newTool.name || ''}
                  onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                  placeholder="e.g., calculate_shipping"
                  className="input-field text-sm w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Description *</label>
                <textarea
                  value={newTool.description || ''}
                  onChange={e => setNewTool({ ...newTool, description: e.target.value })}
                  placeholder="What does this tool do?"
                  className="input-field text-sm w-full mt-1"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Category</label>
                  <select value={newTool.category || 'builtin'} onChange={e => setNewTool({ ...newTool, category: e.target.value })} className="input-field text-sm w-full mt-1">
                    {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Handler Type</label>
                  <select value={newTool.handlerType || 'builtin'} onChange={e => setNewTool({ ...newTool, handlerType: e.target.value })} className="input-field text-sm w-full mt-1">
                    <option value="builtin">Built-in</option>
                    <option value="plugin">Plugin</option>
                    <option value="workflow">Workflow</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Risk Level</label>
                  <select value={newTool.riskLevel || 'low'} onChange={e => setNewTool({ ...newTool, riskLevel: e.target.value })} className="input-field text-sm w-full mt-1">
                    {RISK_LEVELS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Audit Level</label>
                  <select value={newTool.auditLevel || 'standard'} onChange={e => setNewTool({ ...newTool, auditLevel: e.target.value })} className="input-field text-sm w-full mt-1">
                    <option value="none">None</option>
                    <option value="standard">Standard</option>
                    <option value="verbose">Verbose</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Handler Reference (for plugin/workflow/webhook)</label>
                <input
                  value={newTool.handlerRef || ''}
                  onChange={e => setNewTool({ ...newTool, handlerRef: e.target.value })}
                  placeholder="e.g., plugin-slug or workflow-slug or https://..."
                  className="input-field text-sm w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-gray-700))' }}>Allowed Roles</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ROLES.map(role => (
                    <label key={role} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'rgb(var(--color-gray-700))' }}>
                      <input
                        type="checkbox"
                        checked={(newTool.roles || []).includes(role)}
                        onChange={e => {
                          const roles = e.target.checked
                            ? [...(newTool.roles || []), role]
                            : (newTool.roles || []).filter(r => r !== role);
                          setNewTool({ ...newTool, roles });
                        }}
                        className="rounded"
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTool.requiresConfirmation || false}
                    onChange={e => setNewTool({ ...newTool, requiresConfirmation: e.target.checked })}
                    className="rounded"
                    style={{ accentColor: 'rgb(var(--color-orange-500))' }}
                  />
                  <span>Require admin confirmation</span>
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgb(var(--color-gray-200))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-gray-700))', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'rgb(var(--color-primary-600))', color: 'white', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Register Tool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Section */}
      <section className="card p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-gray-900))' }}>
            <Lock className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} /> Recent Audit Logs
          </h3>
          <button onClick={() => fetchAuditLogs(1)} className="btn-secondary btn-sm"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm" style={{ color: 'rgb(var(--color-gray-500))' }}>No audit logs yet. Tool actions will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm" style={{ borderColor: 'rgb(var(--color-gray-200))' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
                  <th className="px-3 py-2 text-left">Timestamp</th>
                  <th className="px-3 py-2 text-left">Tool</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Risk</th>
                  <th className="px-3 py-2 text-left">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-gray-100))', backgroundColor: 'rgb(var(--color-white))' }}>
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2" style={{ color: 'rgb(var(--color-gray-600))' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono" style={{ color: 'rgb(var(--color-gray-800))' }}>{log.toolName}</code>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'rgb(var(--color-gray-600))' }}>
                      {log.userId || 'system'} <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'rgb(var(--color-gray-100))', color: 'rgb(var(--color-gray-500))' }}>{log.userRole}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        log.status === 'executed' ? 'bg-green-100 text-green-800' :
                        log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        log.status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1 rounded ${
                        log.riskLevel === 'low' ? 'bg-green-50 text-green-700' :
                        log.riskLevel === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>{log.riskLevel}</span>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'rgb(var(--color-gray-600))' }}>
                      {log.error ? <span className="text-red-500 text-xs">{log.error}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
