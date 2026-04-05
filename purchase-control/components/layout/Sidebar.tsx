'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { cn, getInitials, getRoleColor, getRoleLabel } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/purchases',  label: 'Purchases',   icon: ShoppingCart },
  { href: '/suppliers',  label: 'Suppliers',   icon: Building2 },
];

const adminItems = [
  { href: '/admin',      label: 'Users',       icon: Users },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">PurchaseFlow</div>
            <div className="text-slate-500 text-xs">Control System</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
          Main
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-6">
              Administration
            </p>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-medium truncate">{profile?.full_name}</div>
            <div className={cn('text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5', getRoleColor(profile?.role ?? 'purchaser'))}>
              {getRoleLabel(profile?.role ?? 'purchaser')}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
