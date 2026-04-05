import { createClient } from '@/lib/supabase/server';
import SuppliersClient from '@/components/suppliers/SuppliersClient';

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: suppliers }, { data: profile }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SuppliersClient
        initialSuppliers={suppliers ?? []}
        currentUser={profile!}
      />
    </div>
  );
}
