'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Purchase,
  PurchaseStep,
  StepNote,
  PurchaseActivity,
  Profile,
  STEP_DEFINITIONS,
} from '@/lib/types';
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusColor,
  getPriorityColor,
  getStepStatusColor,
  getInitials,
  timeAgo,
} from '@/lib/utils';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  Edit3,
  Save,
  X,
  RotateCcw,
  SkipForward,
  Activity,
  Package,
  Wifi,
} from 'lucide-react';
import StepForm from '@/components/steps/StepForm';

interface Props {
  purchase: Purchase & { creator?: Profile };
  steps: PurchaseStep[];
  notes: StepNote[];
  activity: PurchaseActivity[];
  currentUser: Profile;
  allProfiles: Profile[];
}

export default function PurchaseDetail({
  purchase: initialPurchase,
  steps: initialSteps,
  notes: initialNotes,
  activity: initialActivity,
  currentUser,
  allProfiles,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [purchase, setPurchase] = useState(initialPurchase);
  const [steps, setSteps] = useState(initialSteps);
  const [notes, setNotes] = useState(initialNotes);
  const [activity, setActivity] = useState(initialActivity);
  const [expandedStep, setExpandedStep] = useState<string | null>(purchase.current_step);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`purchase-${purchase.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchases',
        filter: `id=eq.${purchase.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setPurchase((prev) => ({ ...prev, ...(payload.new as Purchase) }));
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 2000);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchase_steps',
        filter: `purchase_id=eq.${purchase.id}`,
      }, () => {
        // Refresh steps
        supabase
          .from('purchase_steps')
          .select('*, completer:profiles!purchase_steps_completed_by_fkey(full_name)')
          .eq('purchase_id', purchase.id)
          .order('step_order')
          .then(({ data }) => {
            if (data) {
              setSteps(data);
              setLiveIndicator(true);
              setTimeout(() => setLiveIndicator(false), 2000);
            }
          });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'step_notes',
        filter: `purchase_id=eq.${purchase.id}`,
      }, () => {
        supabase
          .from('step_notes')
          .select('*, author:profiles!step_notes_created_by_fkey(full_name)')
          .eq('purchase_id', purchase.id)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            if (data) setNotes(data);
          });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'purchase_activity',
        filter: `purchase_id=eq.${purchase.id}`,
      }, () => {
        supabase
          .from('purchase_activity')
          .select('*, performer:profiles!purchase_activity_performed_by_fkey(full_name)')
          .eq('purchase_id', purchase.id)
          .order('created_at', { ascending: false })
          .limit(30)
          .then(({ data }) => {
            if (data) setActivity(data);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [purchase.id, supabase]);

  const getStep = useCallback((key: string) => steps.find((s) => s.step_key === key), [steps]);
  const getStepNotes = useCallback((key: string) => notes.filter((n) => n.step_key === key), [notes]);

  async function addNote(stepKey: string) {
    const content = noteInputs[stepKey]?.trim();
    if (!content) return;
    setSavingNote(stepKey);

    await supabase.from('step_notes').insert({
      purchase_id: purchase.id,
      step_key: stepKey,
      content,
      created_by: currentUser.id,
    });

    await supabase.from('purchase_activity').insert({
      purchase_id: purchase.id,
      step_key: stepKey,
      action: 'note_added',
      description: `Note added on "${STEP_DEFINITIONS.find((s) => s.key === stepKey)?.name}": ${content.slice(0, 80)}${content.length > 80 ? '...' : ''}`,
      performed_by: currentUser.id,
    });

    setNoteInputs((prev) => ({ ...prev, [stepKey]: '' }));
    setSavingNote(null);
  }

  async function updateStepStatus(stepKey: string, status: PurchaseStep['status']) {
    setSavingStep(stepKey);
    const now = new Date().toISOString();
    const stepDef = STEP_DEFINITIONS.find((s) => s.key === stepKey);

    const updateData: Partial<PurchaseStep> = { status };
    if (status === 'completed') {
      updateData.completed_at = now;
      updateData.completed_by = currentUser.id;
    }

    await supabase
      .from('purchase_steps')
      .update(updateData)
      .eq('purchase_id', purchase.id)
      .eq('step_key', stepKey);

    // Advance current_step to next if completing
    if (status === 'completed') {
      const currentIdx = STEP_DEFINITIONS.findIndex((s) => s.key === stepKey);
      const nextStep = STEP_DEFINITIONS[currentIdx + 1];
      if (nextStep) {
        await supabase
          .from('purchases')
          .update({ current_step: nextStep.key, updated_at: now })
          .eq('id', purchase.id);

        // Set next step to in_progress
        await supabase
          .from('purchase_steps')
          .update({ status: 'in_progress' })
          .eq('purchase_id', purchase.id)
          .eq('step_key', nextStep.key);

        // Auto-expand next step
        setExpandedStep(nextStep.key);
      } else {
        // All done
        await supabase
          .from('purchases')
          .update({ status: 'completed', current_step: 'completed', updated_at: now })
          .eq('id', purchase.id);
      }
    }

    await supabase.from('purchase_activity').insert({
      purchase_id: purchase.id,
      step_key: stepKey,
      action: 'step_updated',
      description: `"${stepDef?.name}" marked as ${status} by ${currentUser.full_name}`,
      performed_by: currentUser.id,
    });

    setSavingStep(null);
    router.refresh();
  }

  async function saveStepData(stepKey: string, data: Record<string, unknown>) {
    setSavingStep(stepKey);
    const stepDef = STEP_DEFINITIONS.find((s) => s.key === stepKey);

    await supabase
      .from('purchase_steps')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('purchase_id', purchase.id)
      .eq('step_key', stepKey);

    await supabase.from('purchase_activity').insert({
      purchase_id: purchase.id,
      step_key: stepKey,
      action: 'step_data_saved',
      description: `"${stepDef?.name}" details updated by ${currentUser.full_name}`,
      performed_by: currentUser.id,
    });

    setSavingStep(null);
  }

  async function updatePurchaseStatus(status: string) {
    await supabase
      .from('purchases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', purchase.id);

    await supabase.from('purchase_activity').insert({
      purchase_id: purchase.id,
      action: 'status_changed',
      description: `Purchase order status changed to "${status}" by ${currentUser.full_name}`,
      performed_by: currentUser.id,
    });

    setPurchase((prev) => ({ ...prev, status: status as Purchase['status'] }));
    setEditingStatus(false);
    router.refresh();
  }

  const isAdmin = currentUser.role === 'admin';
  const canUpdateStep = (stepKey: string) => {
    if (isAdmin) return true;
    if (stepKey === 'inspection' && currentUser.role === 'warehouse_manager') return true;
    if (stepKey === 'payment' && currentUser.role === 'finance') return true;
    return currentUser.role === 'purchaser' || currentUser.role === 'admin';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-slate-500">{purchase.reference_number}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(purchase.status))}>
                {purchase.status.replace('_', ' ')}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getPriorityColor(purchase.priority))}>
                {purchase.priority}
              </span>
              {liveIndicator && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{purchase.title}</h1>
            {purchase.supplier_name && (
              <p className="text-sm text-slate-500 mt-0.5">Supplier: {purchase.supplier_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => updatePurchaseStatus(e.target.value)}
                defaultValue={purchase.status}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button onClick={() => setEditingStatus(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            (isAdmin || currentUser.role === 'purchaser') && (
              <button
                onClick={() => setEditingStatus(true)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg"
              >
                <Edit3 className="w-3 h-3" /> Change Status
              </button>
            )
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Category</div>
          <div className="font-medium text-slate-700">{purchase.category ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Estimated Value</div>
          <div className="font-medium text-slate-700">
            {purchase.estimated_value ? formatCurrency(purchase.estimated_value, purchase.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Final Value</div>
          <div className="font-medium text-slate-700">
            {purchase.final_value ? formatCurrency(purchase.final_value, purchase.currency) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Created By</div>
          <div className="font-medium text-slate-700">
            {(purchase.creator as Profile | undefined)?.full_name ?? '—'} · {formatDate(purchase.created_at)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Steps */}
        <div className="xl:col-span-2 space-y-3">
          {STEP_DEFINITIONS.map((stepDef) => {
            const step = getStep(stepDef.key);
            const stepNotes = getStepNotes(stepDef.key);
            const isExpanded = expandedStep === stepDef.key;
            const isCurrent = purchase.current_step === stepDef.key;
            const status = step?.status ?? 'pending';

            return (
              <div
                key={stepDef.key}
                className={cn(
                  'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
                  isCurrent ? 'border-blue-300 shadow-blue-100' : 'border-slate-200',
                  status === 'completed' ? 'opacity-80' : ''
                )}
              >
                {/* Step header */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : stepDef.key)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* Step number / status icon */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                    status === 'completed' ? 'bg-green-100 text-green-700' :
                    status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    status === 'blocked' ? 'bg-red-100 text-red-700' :
                    status === 'skipped' ? 'bg-slate-100 text-slate-400' :
                    'bg-slate-100 text-slate-400'
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : status === 'blocked' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      stepDef.order
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{stepDef.name}</span>
                      {isCurrent && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Current</span>
                      )}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getStepStatusColor(status))}>
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {step?.completed_at && (
                        <span className="text-xs text-slate-400">
                          Completed {formatDate(step.completed_at)}
                          {step.completer && ` by ${(step.completer as Profile | undefined)?.full_name}`}
                        </span>
                      )}
                      {stepNotes.length > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {stepNotes.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {/* Step-specific form */}
                    {step && canUpdateStep(stepDef.key) && (
                      <StepForm
                        stepKey={stepDef.key}
                        stepData={step.data}
                        stepStatus={step.status}
                        onSave={(data) => saveStepData(stepDef.key, data)}
                        onStatusChange={(status) => updateStepStatus(stepDef.key, status)}
                        saving={savingStep === stepDef.key}
                        currentUser={currentUser}
                      />
                    )}
                    {!step && (
                      <p className="text-sm text-slate-400 text-center py-2">
                        This step will become available when the purchase reaches this stage.
                      </p>
                    )}

                    {/* Notes section */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Notes
                      </h4>
                      {stepNotes.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {stepNotes.map((note) => (
                            <div key={note.id} className="bg-slate-50 rounded-lg p-3">
                              <p className="text-sm text-slate-700">{note.content}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                                  {getInitials((note.author as Profile | undefined)?.full_name)}
                                </div>
                                <span className="text-xs text-slate-400">
                                  {(note.author as Profile | undefined)?.full_name ?? 'Unknown'} · {timeAgo(note.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mb-2">No notes yet for this step.</p>
                      )}

                      {/* Add note input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteInputs[stepDef.key] ?? ''}
                          onChange={(e) =>
                            setNoteInputs((prev) => ({ ...prev, [stepDef.key]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addNote(stepDef.key)}
                          placeholder="Add a note..."
                          className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                        />
                        <button
                          onClick={() => addNote(stepDef.key)}
                          disabled={savingNote === stepDef.key || !noteInputs[stepDef.key]?.trim()}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {savingNote === stepDef.key ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Activity sidebar */}
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Progress</h3>
            <div className="space-y-2">
              {STEP_DEFINITIONS.map((stepDef) => {
                const step = getStep(stepDef.key);
                const status = step?.status ?? 'pending';
                return (
                  <div key={stepDef.key} className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      status === 'completed' ? 'bg-green-500' :
                      status === 'in_progress' ? 'bg-blue-500' :
                      status === 'blocked' ? 'bg-red-500' :
                      'bg-slate-200'
                    )} />
                    <span className={cn(
                      'text-xs flex-1',
                      status === 'completed' ? 'text-slate-400 line-through' :
                      status === 'in_progress' ? 'text-blue-700 font-medium' :
                      'text-slate-500'
                    )}>
                      {stepDef.name}
                    </span>
                    {status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    {status === 'in_progress' && <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Activity Log</h3>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {activity.length > 0 ? (
                activity.map((act) => (
                  <div key={act.id} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(act.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
