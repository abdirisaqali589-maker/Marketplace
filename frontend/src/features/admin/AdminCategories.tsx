import React, { useState } from 'react';
import { Layers, Plus, X, Save, Trash2, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { get, post, put, del } from '../../lib/api-enhanced';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingScreen from '../shared/LoadingScreen';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const qc = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<any>({ name: '', slug: '', description: '', image: '', commissionRate: '', isActive: true, parentId: null, filters: [], attributes: [] });
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: () => get('/categories') });
  const { data: treeData } = useQuery({ queryKey: ['admin-categories-tree'], queryFn: () => get('/categories/tree') });
  const categories = data?.data || [];
  const tree = treeData?.data || [];

  const saveCat = useMutation({
    mutationFn: (data: any) => editingId ? put(`/categories/${editingId}`, data) : post('/categories', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['admin-categories-tree'] }); toast.success(editingId ? 'Category updated' : 'Category created'); setShowForm(false); setEditingId(null); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => del(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success('Category deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message),
  });

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description || '', image: cat.image || '',
      commissionRate: cat.commissionRate || '', isActive: cat.isActive, parentId: cat.parentId,
      filters: cat.filters || [], attributes: cat.attributes || [],
    });
    setShowForm(true);
  };

  const addFilter = () => setForm({ ...form, filters: [...form.filters, { key: '', label: '', type: 'text', options: [], required: false }] });
  const addAttribute = () => setForm({ ...form, attributes: [...form.attributes, { name: '', label: '', type: 'text', required: false, options: [] }] });

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedIds(newSet);
  };

  const renderTree = (nodes: any[], level = 0) => nodes.map((node: any) => (
    <React.Fragment key={node.id}>
      <div className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer ${selectedCat?.id === node.id ? 'bg-primary-50' : ''}`} style={{ paddingLeft: `${level * 24 + 12}px` }} onClick={() => setSelectedCat(node)}>
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
        {node.children?.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 hover:bg-gray-200 rounded">
            {expandedIds.has(node.id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        ) : <div className="w-4" />}
        <span className="text-sm font-medium text-gray-700">{node.name}</span>
        <span className="text-xs text-gray-400 ml-auto">{node.productCount || 0} products</span>
      </div>
      {expandedIds.has(node.id) && node.children?.length > 0 && renderTree(node.children, level + 1)}
    </React.Fragment>
  ));

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex gap-6">
      {/* Tree */}
      <div className="w-80 shrink-0 card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Category Tree</h3>
          <button onClick={() => { setEditingId(null); setForm({ name: '', slug: '', description: '', image: '', commissionRate: '', isActive: true, parentId: null, filters: [], attributes: [] }); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-3 h-3" /> Root</button>
        </div>
        <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
          {renderTree(tree)}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 card p-6">
        {selectedCat ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{selectedCat.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(null); setForm({ name: '', slug: '', description: '', image: '', commissionRate: '', isActive: true, parentId: selectedCat.id, filters: [], attributes: [] }); setShowForm(true); }} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Subcategory</button>
                <button onClick={() => openEdit(selectedCat)} className="btn-primary btn-sm"><Save className="w-3 h-3" /> Edit</button>
                <button onClick={() => deleteCat.mutate(selectedCat.id)} className="btn-danger btn-sm"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Slug</p><p className="font-medium">{selectedCat.slug}</p></div>
              <div><p className="text-gray-500">Commission</p><p className="font-medium">{selectedCat.commissionRate ? `${selectedCat.commissionRate}%` : 'Default'}</p></div>
              <div><p className="text-gray-500">Level</p><p className="font-medium">{selectedCat.level}</p></div>
              <div><p className="text-gray-500">Active</p><p className="font-medium">{selectedCat.isActive ? 'Yes' : 'No'}</p></div>
            </div>
            {selectedCat.description && <div className="mt-4"><p className="text-gray-500 text-sm">Description</p><p className="text-sm">{selectedCat.description}</p></div>}
            {selectedCat.children?.length > 0 && (
              <div className="mt-4">
                <p className="text-gray-500 text-sm mb-2">Child Categories</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCat.children.map((child: any) => (
                    <button key={child.id} onClick={() => setSelectedCat(child)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">{child.name} ({child._count?.products || 0})</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400"><Layers className="w-12 h-12 mb-2" /><p>Select a category from the tree</p></div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{editingId ? 'Edit' : 'Add'} Category</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug</label><input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="textarea-field" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label><input type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} className="input-field" /></div>
                <div className="flex items-center gap-2 pt-6">
                  <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-primary-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </div>

              {/* Filters */}
              <div><div className="flex items-center justify-between"><h4 className="text-sm font-medium text-gray-700">Filters</h4><button onClick={addFilter} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Add Filter</button></div>
                {form.filters.map((f: any, i: number) => (
                  <div key={i} className="flex gap-2 mt-2 items-start">
                    <input type="text" placeholder="Key" value={f.key} onChange={e => { const nf = [...form.filters]; nf[i].key = e.target.value; setForm({ ...form, filters: nf }); }} className="input-field text-xs w-24" />
                    <input type="text" placeholder="Label" value={f.label} onChange={e => { const nf = [...form.filters]; nf[i].label = e.target.value; setForm({ ...form, filters: nf }); }} className="input-field text-xs flex-1" />
                    <select value={f.type} onChange={e => { const nf = [...form.filters]; nf[i].type = e.target.value; setForm({ ...form, filters: nf }); }} className="select-field text-xs w-24"><option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="range">Range</option><option value="boolean">Boolean</option><option value="color">Color</option></select>
                    <button onClick={() => setForm({ ...form, filters: form.filters.filter((_: any, j: number) => j !== i) })} className="p-1.5 text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              {/* Attributes */}
              <div><div className="flex items-center justify-between"><h4 className="text-sm font-medium text-gray-700">Attributes</h4><button onClick={addAttribute} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Add Attribute</button></div>
                {form.attributes.map((a: any, i: number) => (
                  <div key={i} className="flex gap-2 mt-2 items-start">
                    <input type="text" placeholder="Name" value={a.name} onChange={e => { const na = [...form.attributes]; na[i].name = e.target.value; setForm({ ...form, attributes: na }); }} className="input-field text-xs w-24" />
                    <input type="text" placeholder="Label" value={a.label} onChange={e => { const na = [...form.attributes]; na[i].label = e.target.value; setForm({ ...form, attributes: na }); }} className="input-field text-xs flex-1" />
                    <select value={a.type} onChange={e => { const na = [...form.attributes]; na[i].type = e.target.value; setForm({ ...form, attributes: na }); }} className="select-field text-xs w-24"><option value="text">Text</option><option value="select">Select</option><option value="color">Color</option><option value="size">Size</option></select>
                    <button onClick={() => setForm({ ...form, attributes: form.attributes.filter((_: any, j: number) => j !== i) })} className="p-1.5 text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <button onClick={() => saveCat.mutate(form)} disabled={saveCat.isPending || !form.name} className="btn-primary w-full">{saveCat.isPending ? 'Saving...' : 'Save Category'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}