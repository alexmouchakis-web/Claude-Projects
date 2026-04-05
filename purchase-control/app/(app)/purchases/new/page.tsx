import { createClient } from '@/lib/supabase/server';
import NewPurchaseForm from '@/components/purchases/NewPurchaseForm';

export default async function NewPurchasePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: suppliers }, { data: profile }] = await Promise.all([
    supabase.from('suppliers').select('id,name,country').eq('is_active', true).order('name'),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ]);

  // Get next PO number
  const { data: nextRef } = await supabase.rpc('get_next_po_number');

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details to start tracking a new purchase</p>
      </div>
      <NewPurchaseForm
        suppliers={suppliers ?? []}
        defaultReference={nextRef ?? ''}
        userId={user!.id}
        userRole={profile?.role ?? 'purchaser'}
      />
    </div>
  );
}
