export type UserRole = 'admin' | 'purchaser' | 'warehouse_manager' | 'finance';

export type PurchaseStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';
export type PurchasePriority = 'low' | 'normal' | 'high' | 'urgent';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  country?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  reference_number: string;
  title: string;
  description?: string;
  category?: string;
  supplier_id?: string;
  supplier_name?: string;
  currency: string;
  estimated_value?: number;
  final_value?: number;
  current_step: string;
  status: PurchaseStatus;
  priority: PurchasePriority;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  creator?: Profile;
  steps?: PurchaseStep[];
}

export interface PurchaseStep {
  id: string;
  purchase_id: string;
  step_key: string;
  step_name: string;
  step_order: number;
  status: StepStatus;
  data: Record<string, unknown>;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  completer?: Profile;
  notes?: StepNote[];
}

export interface StepNote {
  id: string;
  purchase_id: string;
  step_key: string;
  content: string;
  created_by?: string;
  created_at: string;
  // joined
  author?: Profile;
}

export interface PurchaseActivity {
  id: string;
  purchase_id: string;
  step_key?: string;
  action: string;
  description: string;
  performed_by?: string;
  created_at: string;
  // joined
  performer?: Profile;
}

// Step-specific data types
export interface QuotationData {
  suppliers_contacted?: string;
  selected_offer?: string;
  quote_amount?: string;
  quote_reference?: string;
  quote_date?: string;
  delivery_terms?: string;
}

export interface OrderData {
  po_number?: string;
  po_date?: string;
  order_confirmed?: boolean;
  confirmation_date?: string;
  confirmed_amount?: string;
  delivery_date_promised?: string;
}

export interface ProformaData {
  proforma_number?: string;
  proforma_date?: string;
  proforma_amount?: string;
  payment_terms?: string;
  payment_due_date?: string;
}

export interface PaymentData {
  payment_method?: string;
  payment_date?: string;
  amount_paid?: string;
  bank_reference?: string;
  payment_confirmed?: boolean;
  receipt_url?: string;
}

export interface LoadingData {
  loading_date?: string;
  loaded_confirmed?: boolean;
  loading_location?: string;
  quantity_loaded?: string;
  loading_reference?: string;
}

export interface ShippingData {
  transport_company?: string;
  transport_contact?: string;
  tracking_number?: string;
  bill_of_lading?: string;
  vessel_name?: string;
  departure_date?: string;
  eta?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  incoterms?: string;
}

export interface CustomsData {
  customs_broker?: string;
  declaration_number?: string;
  customs_entry_date?: string;
  duties_amount?: string;
  released_date?: string;
  customs_cleared?: boolean;
}

export interface ArrivalData {
  arrival_date?: string;
  driver_name?: string;
  vehicle_plate?: string;
  delivery_note_number?: string;
  actual_quantity?: string;
}

export interface InspectionData {
  inspection_date?: string;
  inspector_name?: string;
  accepted?: boolean | null;
  rejected_reason?: string;
  quantity_accepted?: string;
  quantity_rejected?: string;
}

// All step keys in order
export const STEP_DEFINITIONS = [
  { key: 'request',    name: 'Purchase Request',     order: 1,  icon: 'ClipboardList' },
  { key: 'quotation',  name: 'Offer / Quotation',    order: 2,  icon: 'FileText' },
  { key: 'order',      name: 'Order Placement',      order: 3,  icon: 'ShoppingCart' },
  { key: 'proforma',   name: 'Proforma Invoice',     order: 4,  icon: 'Receipt' },
  { key: 'payment',    name: 'Payment',              order: 5,  icon: 'CreditCard' },
  { key: 'loading',    name: 'Loading / Dispatch',   order: 6,  icon: 'Package' },
  { key: 'shipping',   name: 'Shipping & Transport', order: 7,  icon: 'Ship' },
  { key: 'customs',    name: 'Customs Clearance',    order: 8,  icon: 'Stamp' },
  { key: 'arrival',    name: 'Arrival at Factory',   order: 9,  icon: 'MapPin' },
  { key: 'inspection', name: 'Warehouse Inspection', order: 10, icon: 'ClipboardCheck' },
  { key: 'completed',  name: 'Completed',            order: 11, icon: 'CheckCircle' },
] as const;

export type StepKey = typeof STEP_DEFINITIONS[number]['key'];

export const PURCHASE_CATEGORIES = [
  'Raw Materials',
  'Chemicals',
  'Packaging',
  'Equipment',
  'Spare Parts',
  'Consumables',
  'Services',
  'Other',
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];
