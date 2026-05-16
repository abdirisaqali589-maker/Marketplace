import React, { useState } from 'react';
import { Shield, Plus, X, Save, Trash2, Users } from 'lucide-react';
import { get, post, put, del } from '../../lib/api-enhanced';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import LoadingScreen from '../shared/LoadingScreen';
import toast from 'react-hot-toast';

const modules = ['users', 'products', 'categories', 'orders', 'sellers', 'reviews', 'config', 'roles'];
const actions = ['Create', 'Read', 'Update', 'Delete', 'Approve'];

export default function AdminRoles() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: {} as Record<string, string[]> });

  const { data, isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: () => get('/admin/roles') });
  const roles = data?.data || [];

  const saveRole = useMutation({
    mutationFn: (data: any) => editingId ? put(`/admin/roles/${editingId}`, data) : post('/admin/roles', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success(editingId ? 'Role updated' : 'Role created'); setShowForm(false); setEditingId(null); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteRole = useMutation({
    mutationFn: (id: string) => del(`/admin/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success('Role deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message),
  });

  const togglePermission = (module: string, action: string) => {
    const current = form.permissions[module] || [];
    const updated = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    setForm({ ...form, permissions: { ...form.permissions, [module]: updated } });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Roles & Permissions</h2>
        <button onClick={() => { setEditingId(null); setForm({ name: '', description: '', permissions: {} }); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Role</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role: any) => (
          <div key={role.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="font-semibold text-gray-900">{role.name}</p>
                  <p className="text-xs text-gray-500">{role._count?.users || 0} users</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(role.id); setForm({ name: role.name, description: role.description || '', permissions: role.permissions ? JSON.parse(role.permissions) : {} }); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded"><Save className="w-4 h-4 text-gray-500" /></button>
                {!role.isSystem && <button onClick={() => deleteRole.mutate(role.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>}
              </div>
            </div>
            {role.description && <p className="text-sm text-gray-500 mt-2">{role.description}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{editingId ? 'Edit' : 'Add'} Role</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_repeat(5,auto)] gap-0 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    <span>Module</span>
                    {actions.map(a => <span key={a} className="w-14 text-center">{a}</span>)}
                  </div>
                  {modules.map(m => (
                    <div key={m} className="grid grid-cols-[1fr_repeat(5,auto)] gap-0 px-3 py-2 border-t hover:bg-gray-50">
                      <span className="text-sm capitalize text-gray-700">{m}</span>
                      {actions.map(a => {
                        const checked = (form.permissions[m] || []).includes(a);
                        return (
                          <button key={a} onClick={() => togglePermission(m, a)} className={`w-14 h-6 flex items-center justify-center rounded text-xs ${checked ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                            {checked ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => saveRole.mutate({ name: form.name, description: form.description, permissions: Object.keys(form.permissions).length > 0 ? form.permissions : undefined })} disabled={saveRole.isPending || !form.name} className="btn-primary w-full">{saveRole.isPending ? 'Saving...' : 'Save Role'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}