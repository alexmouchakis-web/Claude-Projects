'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Supplier, Profile } from '@/lib/types';
import { Plus, Building2, Globe, Phone, Mail, Edit2, Trash2, Check, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

const EMPTY_FORM = {
  name: '',
  country: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  notes: '',
};

export default function SuppliersClient({
  initialSuppliers,
  currentUser,
}: {
  initialSuppliers: Supplier[];
  currentUser: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'purchaser';

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.country ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      country: s.country ?? '',
      contact_name: s.contact_name ?? '',
      contact_email: s.contact_email ?? '',
      contact_phone: s.contact_phone ?? '',
      notes: s.notes ?? '',
    });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');

    if (editingId) {
      const { data, error: err } = await supabase
        .from('suppliers')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      setSuppliers((prev) => prev.map((s) => s.id === editingId ? data : s));
      setEditingId(null);
    } else {
      const { data, error: err } = await supabase
        .from('suppliers')
        .insert({ ...form, created_by: currentUser.id })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      setSuppliers((prev) => [...prev, data]);
      setShowForm(false);
    }
    setForm(EMPTY_FORM);
    setSaving(false);
    router.refresh();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('suppliers').update({ is_active: !current }).eq('id', id);
    setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
  }

  const FormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
        <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
          placeholder="e.g. Spain" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
        <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
        <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setError(''); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Add supplier form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">New Supplier</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <FormFields />
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-sm px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Supplier list */}
      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            {editingId === s.id ? (
              <div>
                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                <FormFields />
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg">
                    {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button onClick={() => { setEditingId(null); setError(''); }} className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{s.name}</h3>
                      {!s.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                      {s.country && (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{s.country}</span>
                      )}
                      {s.contact_name && <span>{s.contact_name}</span>}
                      {s.contact_email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.contact_email}</span>
                      )}
                      {s.contact_phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.contact_phone}</span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-slate-400 mt-1">{s.notes}</p>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(s.id, s.is_active)}
                      className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                      title={s.is_active ? 'Deactivate' : 'Activate'}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No suppliers found</p>
          </div>
        )}
      </div>
    </>
  );
}
