import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Plus,
  Search,
  ShoppingCart,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { formatDate, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils';
import { STEP_DEFINITIONS } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ status?: string; priority?: string; search?: string }>;
}

export default async function PurchasesPage({ searchParams }: PageProps) {
  const { status, priority, search } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('purchases')
    .select('*, creator:profiles!purchases_created_by_fkey(full_name)')
    .order('updated_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (priority && priority !== 'all') query = query.eq('priority', priority);
  if (search) query = query.or(`title.ilike.%${search}%,reference_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);

  const { data: purchases } = await query;

  function getStepLabel(key: string) {
    return STEP_DEFINITIONS.find((s) => s.key === key)?.name ?? key;
  }

  function getStepProgress(currentStep: string): number {
    const idx = STEP_DEFINITIONS.findIndex((s) => s.key === currentStep);
    return Math.round(((idx + 1) / STEP_DEFINITIONS.length) * 100);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">
            {purchases?.length ?? 0} order{(purchases?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Purchase Order
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium text-slate-600 block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Reference, title, supplier..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Status</label>
            <select
              name="status"
              defaultValue={status ?? 'all'}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Priority</label>
            <select
              name="priority"
              defaultValue={priority ?? 'all'}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {purchases && purchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title / Supplier</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Step</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases.map((p) => {
                  const progress = getStepProgress(p.current_step);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-medium text-slate-600">{p.reference_number}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${getPriorityColor(p.priority)}`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 max-w-xs truncate">{p.title}</div>
                        {p.supplier_name && (
                          <div className="text-xs text-slate-400 mt-0.5">{p.supplier_name}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(p.status)}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-600">{getStepLabel(p.current_step)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-16">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {p.final_value
                          ? formatCurrency(p.final_value, p.currency)
                          : p.estimated_value
                          ? `~${formatCurrency(p.estimated_value, p.currency)}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">{formatDate(p.updated_at)}</td>
                      <td className="px-5 py-4">
                        <Link href={`/purchases/${p.id}`} className="text-blue-600 hover:text-blue-700">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No purchase orders found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || status || priority ? 'Try adjusting your filters' : 'Create your first purchase order to get started'}
            </p>
            {!search && !status && !priority && (
              <Link
                href="/purchases/new"
                className="inline-flex items-center gap-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> New Purchase Order
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
