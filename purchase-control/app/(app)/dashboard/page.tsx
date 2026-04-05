import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { formatDate, getStatusColor, getPriorityColor, getStepStatusDot } from '@/lib/utils';
import { STEP_DEFINITIONS } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: purchases },
    { data: recentActivity },
    { count: activeCount },
    { count: completedCount },
    { count: onHoldCount },
  ] = await Promise.all([
    supabase
      .from('purchases')
      .select('*, creator:profiles!purchases_created_by_fkey(full_name)')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('purchase_activity')
      .select('*, performer:profiles!purchase_activity_performed_by_fkey(full_name), purchase:purchases(reference_number,title)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'on_hold'),
  ]);

  const stats = [
    { label: 'Active Orders',    value: activeCount ?? 0,    icon: ShoppingCart, color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Completed',        value: completedCount ?? 0, icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'On Hold',          value: onHoldCount ?? 0,    icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Total',            value: (activeCount ?? 0) + (completedCount ?? 0) + (onHoldCount ?? 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  function getStepLabel(key: string) {
    return STEP_DEFINITIONS.find((s) => s.key === key)?.name ?? key;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of all purchase orders</p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Purchase Order
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchases */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Purchases</h2>
            <Link href="/purchases" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {purchases && purchases.length > 0 ? (
              purchases.map((p) => (
                <Link
                  key={p.id}
                  href={`/purchases/${p.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-medium text-slate-500">{p.reference_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(p.priority)}`}>
                        {p.priority}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-800 truncate">{p.title}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {p.supplier_name && (
                        <span className="text-xs text-slate-400">{p.supplier_name}</span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${getStepStatusDot('in_progress')}`} />
                        {getStepLabel(p.current_step)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">{formatDate(p.updated_at)}</div>
                    <ArrowRight className="w-4 h-4 text-slate-300 mt-1 ml-auto" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No purchase orders yet</p>
                <Link href="/purchases/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                  Create your first order
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto max-h-96">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {activity.performer?.full_name ?? 'System'}
                      </span>
                      {activity.purchase && (
                        <Link
                          href={`/purchases/${activity.purchase_id}`}
                          className="text-xs text-blue-500 hover:underline truncate"
                        >
                          {(activity.purchase as { reference_number?: string })?.reference_number}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
