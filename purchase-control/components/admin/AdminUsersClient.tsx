'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/lib/types';
import { cn, getInitials, getRoleColor, getRoleLabel, formatDate } from '@/lib/utils';
import { Users, Shield, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin',             label: 'Admin',             description: 'Full access, user management' },
  { value: 'purchaser',         label: 'Purchaser',         description: 'Create and manage purchase orders' },
  { value: 'warehouse_manager', label: 'Warehouse Manager', description: 'Receive goods, inspection & acceptance' },
  { value: 'finance',           label: 'Finance',           description: 'Manage payments and invoices' },
];

export default function AdminUsersClient({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [localProfiles, setLocalProfiles] = useState(profiles);

  async function updateRole(userId: string, newRole: UserRole) {
    setSaving(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setLocalProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );
    setSaving(null);
    router.refresh();
  }

  const roleCounts = ROLES.map((r) => ({
    ...r,
    count: localProfiles.filter((p) => p.role === r.value).length,
  }));

  return (
    <div className="space-y-6">
      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleCounts.map((r) => (
          <div key={r.value} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={cn('text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2', getRoleColor(r.value))}>
              {r.label}
            </div>
            <div className="text-2xl font-bold text-slate-900">{r.count}</div>
            <div className="text-xs text-slate-400 mt-0.5">{r.description}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">All Users ({localProfiles.length})</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {localProfiles.map((profile) => (
            <div key={profile.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {getInitials(profile.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{profile.full_name}</span>
                  {profile.id === currentUserId && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{profile.email}</div>
                <div className="text-xs text-slate-400">Joined {formatDate(profile.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                    disabled={saving === profile.id || profile.id === currentUserId}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-lg border appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
                      profile.id === currentUserId ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : 'bg-white border-slate-300',
                    )}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                {saving === profile.id && (
                  <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role descriptions */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600" />
          <h3 className="font-medium text-blue-800 text-sm">Role Permissions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <div key={r.value}>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getRoleColor(r.value))}>
                {r.label}
              </span>
              <p className="text-xs text-blue-700 mt-1 ml-1">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
