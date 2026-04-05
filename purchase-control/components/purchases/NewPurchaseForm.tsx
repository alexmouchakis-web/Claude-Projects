'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PURCHASE_CATEGORIES, CURRENCIES, STEP_DEFINITIONS } from '@/lib/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Props {
  suppliers: { id: string; name: string; country?: string }[];
  defaultReference: string;
  userId: string;
  userRole: string;
}

export default function NewPurchaseForm({ suppliers, defaultReference, userId, userRole: _userRole }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reference_number: defaultReference,
    title: '',
    description: '',
    category: '',
    supplier_id: '',
    supplier_name: '',
    currency: 'EUR',
    estimated_value: '',
    priority: 'normal',
    notes: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === 'supplier_id') {
      const supplier = suppliers.find((s) => s.id === value);
      setForm((f) => ({ ...f, supplier_id: value, supplier_name: supplier?.name ?? '' }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        reference_number: form.reference_number,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        supplier_id: form.supplier_id || null,
        supplier_name: form.supplier_name || null,
        currency: form.currency,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        priority: form.priority,
        current_step: 'request',
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (purchaseError) {
      setError(purchaseError.message);
      setLoading(false);
      return;
    }

    // Create all steps in order
    const steps = STEP_DEFINITIONS.map((s) => ({
      purchase_id: purchase.id,
      step_key: s.key,
      step_name: s.name,
      step_order: s.order,
      status: s.key === 'request' ? 'in_progress' : 'pending',
      data: {},
    }));

    await supabase.from('purchase_steps').insert(steps);

    // Log activity
    await supabase.from('purchase_activity').insert({
      purchase_id: purchase.id,
      step_key: 'request',
      action: 'created',
      description: `Purchase order ${form.reference_number} created: "${form.title}"`,
      performed_by: userId,
    });

    // Add initial note if provided
    if (form.notes.trim()) {
      await supabase.from('step_notes').insert({
        purchase_id: purchase.id,
        step_key: 'request',
        content: form.notes.trim(),
        created_by: userId,
      });
    }

    router.push(`/purchases/${purchase.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reference Number <span className="text-red-500">*</span>
            </label>
            <input
              name="reference_number"
              value={form.reference_number}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title / Description of goods <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. Epoxy Resin Type A - 5 tons"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal notes / specifications</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Technical specs, internal requirements..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select category...</option>
              {PURCHASE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Supplier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Supplier</label>
            <select
              name="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Choose from list...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.country ? ` (${s.country})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Or type supplier name</label>
            <input
              name="supplier_name"
              value={form.supplier_name}
              onChange={handleChange}
              placeholder="Supplier name"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Financial */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Financial</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value</label>
            <input
              name="estimated_value"
              type="number"
              step="0.01"
              min="0"
              value={form.estimated_value}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Initial Note */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Initial Note (optional)</h2>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any initial notes about this purchase request..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/purchases"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Create Purchase Order
        </button>
      </div>
    </form>
  );
}
