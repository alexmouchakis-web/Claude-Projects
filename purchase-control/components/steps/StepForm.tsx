'use client';

import { useState } from 'react';
import { Profile, StepStatus } from '@/lib/types';
import { Save, CheckCircle, SkipForward, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  stepKey: string;
  stepData: Record<string, unknown>;
  stepStatus: StepStatus;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onStatusChange: (status: StepStatus) => Promise<void>;
  saving: boolean;
  currentUser: Profile;
}

export default function StepForm({ stepKey, stepData, stepStatus, onSave, onStatusChange, saving, currentUser }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(stepData);
  const [dirty, setDirty] = useState(false);

  function set(field: string, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    await onSave(data);
    setDirty(false);
  }

  const isCompleted = stepStatus === 'completed';
  const isSkipped = stepStatus === 'skipped';

  const inputClass = cn(
    'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
    isCompleted ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-300'
  );
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

  const field = (label: string, fieldName: string, opts?: { type?: string; placeholder?: string; options?: string[] }) => (
    <div>
      <label className={labelClass}>{label}</label>
      {opts?.options ? (
        <select
          value={(data[fieldName] as string) ?? ''}
          onChange={(e) => set(fieldName, e.target.value)}
          disabled={isCompleted}
          className={cn(inputClass, 'bg-white')}
        >
          <option value="">Select...</option>
          {opts.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={opts?.type ?? 'text'}
          value={(data[fieldName] as string) ?? ''}
          onChange={(e) => set(fieldName, e.target.value)}
          placeholder={opts?.placeholder}
          disabled={isCompleted}
          className={inputClass}
        />
      )}
    </div>
  );

  const checkField = (label: string, fieldName: string, description?: string) => (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={`${stepKey}-${fieldName}`}
        checked={(data[fieldName] as boolean) ?? false}
        onChange={(e) => set(fieldName, e.target.checked)}
        disabled={isCompleted}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={`${stepKey}-${fieldName}`} className="text-sm text-slate-700 cursor-pointer">
        {label}
        {description && <span className="block text-xs text-slate-400 mt-0.5">{description}</span>}
      </label>
    </div>
  );

  function renderFields() {
    switch (stepKey) {
      case 'request':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('Requested By (department)', 'requested_by', { placeholder: 'e.g. Production Dept.' })}
            {field('Date Needed By', 'needed_by_date', { type: 'date' })}
            {field('Quantity Required', 'quantity', { placeholder: 'e.g. 5000 kg' })}
            {field('Technical Specification', 'specification', { placeholder: 'Spec code or description' })}
          </div>
        );

      case 'quotation':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Suppliers Contacted', 'suppliers_contacted', { placeholder: 'List of suppliers asked for quotes' })}
              {field('Quote Request Date', 'quote_request_date', { type: 'date' })}
              {field('Selected Supplier / Offer', 'selected_offer', { placeholder: 'Name of chosen supplier' })}
              {field('Quote Reference No.', 'quote_reference', { placeholder: 'Supplier quote reference' })}
              {field('Quote Date', 'quote_date', { type: 'date' })}
              {field('Quoted Amount', 'quote_amount', { placeholder: 'e.g. 12,500.00' })}
              {field('Delivery Terms (Incoterms)', 'delivery_terms', { options: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'] })}
              {field('Promised Delivery Date', 'promised_delivery', { type: 'date' })}
            </div>
            {checkField('Offer accepted & approved', 'offer_accepted')}
          </div>
        );

      case 'order':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Purchase Order No.', 'po_number', { placeholder: 'Internal PO number' })}
              {field('PO Date Sent', 'po_date', { type: 'date' })}
              {field('Confirmed Quantity', 'confirmed_quantity', { placeholder: 'e.g. 5000 kg' })}
              {field('Confirmed Amount', 'confirmed_amount', { placeholder: 'Final ordered value' })}
              {field('Supplier Confirmation Ref.', 'confirmation_ref', { placeholder: 'Supplier order confirmation' })}
              {field('Confirmation Date', 'confirmation_date', { type: 'date' })}
              {field('Promised Shipment Date', 'shipment_date', { type: 'date' })}
            </div>
            {checkField('Order confirmed by supplier', 'order_confirmed', 'Supplier has acknowledged the PO')}
          </div>
        );

      case 'proforma':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Proforma Invoice No.', 'proforma_number', { placeholder: 'PI number from supplier' })}
              {field('Proforma Date', 'proforma_date', { type: 'date' })}
              {field('Proforma Amount', 'proforma_amount', { placeholder: 'Amount on proforma invoice' })}
              {field('Payment Terms', 'payment_terms', { placeholder: 'e.g. 30% advance, 70% on BL' })}
              {field('Payment Due Date', 'payment_due_date', { type: 'date' })}
            </div>
            {checkField('Proforma invoice received', 'proforma_received')}
            {checkField('Proforma approved internally', 'proforma_approved', 'Finance/management has approved payment')}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Payment Method', 'payment_method', { options: ['Bank Transfer (T/T)', 'Letter of Credit (L/C)', 'Documentary Collection', 'Cash in Advance', 'Open Account'] })}
              {field('Amount Paid', 'amount_paid', { placeholder: 'Amount transferred' })}
              {field('Payment Date', 'payment_date', { type: 'date' })}
              {field('Bank Reference / SWIFT', 'bank_reference', { placeholder: 'Transaction reference' })}
              {field('Bank Name', 'bank_name', { placeholder: 'Our bank used' })}
            </div>
            {checkField('Payment executed', 'payment_executed', 'Bank transfer has been made')}
            {checkField('Payment confirmed by supplier', 'payment_confirmed', 'Supplier acknowledged receipt of payment')}
          </div>
        );

      case 'loading':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Scheduled Loading Date', 'scheduled_loading_date', { type: 'date' })}
              {field('Actual Loading Date', 'actual_loading_date', { type: 'date' })}
              {field('Loading Location / Port', 'loading_location', { placeholder: 'Factory / port of loading' })}
              {field('Quantity Loaded', 'quantity_loaded', { placeholder: 'e.g. 5000 kg / 20 pallets' })}
              {field('Loading Reference / Lot No.', 'loading_reference', { placeholder: 'Lot or batch number' })}
              {field('Export Declaration No.', 'export_declaration', { placeholder: 'If applicable' })}
            </div>
            {checkField('Goods loaded and dispatched', 'loaded_confirmed', 'Confirmed goods have left supplier')}
            {checkField('Loading documents received', 'loading_docs_received', 'Packing list, COA, etc. received')}
          </div>
        );

      case 'shipping':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Transport Company', 'transport_company', { placeholder: 'Freight forwarder / carrier' })}
              {field('Transport Contact', 'transport_contact', { placeholder: 'Phone or email' })}
              {field('Tracking Number / AWB / BL', 'tracking_number', { placeholder: 'Tracking reference' })}
              {field('Vessel / Truck / Flight', 'vessel_name', { placeholder: 'Vessel name, truck plate, etc.' })}
              {field('Bill of Lading No.', 'bill_of_lading', { placeholder: 'B/L number if sea freight' })}
              {field('Port / Place of Loading', 'port_loading', { placeholder: 'e.g. Barcelona, Spain' })}
              {field('Port / Place of Discharge', 'port_discharge', { placeholder: 'e.g. Piraeus, Greece' })}
              {field('Departure Date', 'departure_date', { type: 'date' })}
              {field('Estimated Arrival (ETA)', 'eta', { type: 'date' })}
              {field('Incoterms', 'incoterms', { options: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'] })}
            </div>
            {checkField('Shipping documents received', 'shipping_docs_received', 'BL, invoice, packing list, COA received')}
          </div>
        );

      case 'customs':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Customs Broker', 'customs_broker', { placeholder: 'Name of customs agent' })}
              {field('Broker Contact', 'broker_contact', { placeholder: 'Phone or email' })}
              {field('Customs Entry Date', 'customs_entry_date', { type: 'date' })}
              {field('Declaration / Entry Number', 'declaration_number', { placeholder: 'Customs declaration ref' })}
              {field('Import Duties Amount', 'duties_amount', { placeholder: 'Total duties & taxes paid' })}
              {field('Customs Release Date', 'released_date', { type: 'date' })}
            </div>
            {checkField('Documents submitted to customs', 'docs_submitted')}
            {checkField('Customs cleared', 'customs_cleared', 'Goods released by customs authorities')}
          </div>
        );

      case 'arrival':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Actual Arrival Date', 'arrival_date', { type: 'date' })}
              {field('Arrival Time', 'arrival_time', { type: 'time' })}
              {field('Driver Name', 'driver_name', { placeholder: 'Delivery driver' })}
              {field('Vehicle / Truck Plate', 'vehicle_plate', { placeholder: 'e.g. ABC-1234' })}
              {field('Delivery Note / CMR No.', 'delivery_note_number', { placeholder: 'Delivery document number' })}
              {field('Quantity Delivered', 'actual_quantity', { placeholder: 'Actual delivered quantity' })}
            </div>
            {checkField('Goods arrived at factory', 'arrived_confirmed', 'Delivery truck arrived on site')}
          </div>
        );

      case 'inspection':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('Inspection Date', 'inspection_date', { type: 'date' })}
              {field('Inspector Name', 'inspector_name', { placeholder: 'Warehouse manager / QC' })}
              {field('Quantity Accepted', 'quantity_accepted', { placeholder: 'Accepted quantity' })}
              {field('Quantity Rejected', 'quantity_rejected', { placeholder: '0 if all accepted' })}
            </div>
            <div>
              <label className={labelClass}>Inspection Result</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${stepKey}-accepted`}
                    checked={data.accepted === true}
                    onChange={() => set('accepted', true)}
                    disabled={isCompleted}
                    className="text-green-600"
                  />
                  <span className="text-sm text-green-700 font-medium">✓ Accepted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${stepKey}-accepted`}
                    checked={data.accepted === false}
                    onChange={() => set('accepted', false)}
                    disabled={isCompleted}
                    className="text-red-600"
                  />
                  <span className="text-sm text-red-700 font-medium">✗ Rejected / Issues</span>
                </label>
              </div>
            </div>
            {data.accepted === false && (
              <div>
                <label className={labelClass}>Reason for rejection / issues found</label>
                <textarea
                  value={(data.rejected_reason as string) ?? ''}
                  onChange={(e) => set('rejected_reason', e.target.value)}
                  disabled={isCompleted}
                  rows={3}
                  className={cn(inputClass, 'resize-none')}
                  placeholder="Describe the issues..."
                />
              </div>
            )}
          </div>
        );

      case 'completed':
        return (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-700 font-medium">Purchase order completed!</p>
            <div className="grid grid-cols-2 gap-3 mt-4 text-left">
              {field('Completion Date', 'completion_date', { type: 'date' })}
              {field('Final Invoice No.', 'final_invoice', { placeholder: 'Supplier final invoice ref' })}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div>
      <div className="mb-4">{renderFields()}</div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
        {dirty && !isCompleted && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        )}

        {!dirty && !isCompleted && stepKey !== 'completed' && (
          <button
            onClick={async () => { await handleSave(); await onStatusChange('completed'); }}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Mark as Complete
          </button>
        )}

        {dirty && !isCompleted && (
          <button
            onClick={async () => { await handleSave(); await onStatusChange('completed'); }}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Save & Complete
          </button>
        )}

        {!isCompleted && !isSkipped && stepKey !== 'request' && (
          <button
            onClick={() => onStatusChange('skipped')}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip Step
          </button>
        )}

        {!isCompleted && (
          <button
            onClick={() => onStatusChange('blocked')}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors border',
              stepStatus === 'blocked'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'text-slate-500 hover:text-orange-600 border-slate-200 hover:border-orange-200'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {stepStatus === 'blocked' ? 'Blocked' : 'Mark Blocked'}
          </button>
        )}

        {isCompleted && (
          <button
            onClick={() => onStatusChange('in_progress')}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reopen Step
          </button>
        )}
      </div>
    </div>
  );
}
