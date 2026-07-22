"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Search, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', icon: '', bg: '', iconColor: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name) return toast.error('Name is required');
    try {
      await api.post('/admin/categories', createForm);
      toast.success('Category created');
      setIsCreating(false);
      setCreateForm({ name: '', description: '', icon: '', bg: '', iconColor: '' });
      fetchCategories();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name) return toast.error('Name is required');
    try {
      await api.put(`/admin/categories/${id}`, editForm);
      toast.success('Category updated');
      setIsEditing(null);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6 overflow-y-auto pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Taxonomy Sync (Categories)</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4 font-medium">Icon UI</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Icon / Colors</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isCreating && (
              <tr className="bg-white/[0.02]">
                <td className="px-6 py-4">Preview</td>
                <td className="px-6 py-4">
                  <input type="text" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Name" className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                </td>
                <td className="px-6 py-4">
                  <input type="text" value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Description" className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                </td>
                <td className="px-6 py-4 space-y-2">
                  <input type="text" value={createForm.icon} onChange={e => setCreateForm({...createForm, icon: e.target.value})} placeholder="Ionicon Name (e.g. shirt-outline)" className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                  <div className="flex gap-2">
                    <input type="text" value={createForm.bg} onChange={e => setCreateForm({...createForm, bg: e.target.value})} placeholder="Bg Hex" className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                    <input type="text" value={createForm.iconColor} onChange={e => setCreateForm({...createForm, iconColor: e.target.value})} placeholder="Icon Hex" className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={handleCreate} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsCreating(false)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {categories.map((cat) => isEditing === cat.id ? (
              <tr key={cat.id} className="bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: editForm.bg || '#FFEBE3' }}>
                    <span style={{ color: editForm.iconColor || '#FF7846', fontSize: '10px' }}>Icon</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                </td>
                <td className="px-6 py-4">
                  <input type="text" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                </td>
                <td className="px-6 py-4 space-y-2">
                  <input type="text" value={editForm.icon} onChange={e => setEditForm({...editForm, icon: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                  <div className="flex gap-2">
                    <input type="text" value={editForm.bg} onChange={e => setEditForm({...editForm, bg: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                    <input type="text" value={editForm.iconColor} onChange={e => setEditForm({...editForm, iconColor: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded px-3 py-1.5 text-slate-900 font-bold" />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditing(null)} className="p-1.5 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.bg || '#FFEBE3' }}>
                    <span style={{ color: cat.iconColor || '#FF7846', fontSize: '10px' }}>{cat.icon || 'icon'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-900 font-bold font-medium">{cat.name}</td>
                <td className="px-6 py-4 text-slate-500 font-medium">{cat.description || '-'}</td>
                <td className="px-6 py-4 text-slate-500 font-medium">
                  {cat.icon || 'N/A'} <br/>
                  <span className="text-xs">{cat.bg} / {cat.iconColor}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setIsEditing(cat.id); setEditForm(cat); }}
                      className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && !isCreating && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                  No categories found. Create one to populate the mobile app!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

