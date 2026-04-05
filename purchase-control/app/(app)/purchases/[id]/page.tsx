import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PurchaseDetail from '@/components/purchases/PurchaseDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: purchase },
    { data: steps },
    { data: activity },
    { data: profile },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from('purchases')
      .select('*, creator:profiles!purchases_created_by_fkey(full_name,email)')
      .eq('id', id)
      .single(),
    supabase
      .from('purchase_steps')
      .select('*, completer:profiles!purchase_steps_completed_by_fkey(full_name)')
      .eq('purchase_id', id)
      .order('step_order'),
    supabase
      .from('purchase_activity')
      .select('*, performer:profiles!purchase_activity_performed_by_fkey(full_name)')
      .eq('purchase_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('profiles').select('*').order('full_name'),
  ]);

  if (!purchase) notFound();

  // Fetch notes for all steps
  const { data: notes } = await supabase
    .from('step_notes')
    .select('*, author:profiles!step_notes_created_by_fkey(full_name)')
    .eq('purchase_id', id)
    .order('created_at', { ascending: true });

  return (
    <PurchaseDetail
      purchase={purchase}
      steps={steps ?? []}
      notes={notes ?? []}
      activity={activity ?? []}
      currentUser={profile!}
      allProfiles={profiles ?? []}
    />
  );
}
