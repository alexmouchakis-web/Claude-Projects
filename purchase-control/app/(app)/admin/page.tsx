import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminUsersClient from '@/components/admin/AdminUsersClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage user accounts and roles</p>
      </div>
      <AdminUsersClient profiles={profiles ?? []} currentUserId={user!.id} />
    </div>
  );
}
