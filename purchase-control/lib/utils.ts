import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PurchasePriority, PurchaseStatus, StepStatus, UserRole } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount?: number | null, currency = 'EUR'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getStatusColor(status: PurchaseStatus): string {
  const map: Record<PurchaseStatus, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

export function getPriorityColor(priority: PurchasePriority): string {
  const map: Record<PurchasePriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return map[priority] ?? 'bg-gray-100 text-gray-600';
}

export function getStepStatusColor(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    pending: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    skipped: 'bg-gray-100 text-gray-400',
    blocked: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

export function getStepStatusDot(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    pending: 'bg-gray-300',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    skipped: 'bg-gray-300',
    blocked: 'bg-red-500',
  };
  return map[status] ?? 'bg-gray-300';
}

export function getRoleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: 'Admin',
    purchaser: 'Purchaser',
    warehouse_manager: 'Warehouse Manager',
    finance: 'Finance',
  };
  return map[role] ?? role;
}

export function getRoleColor(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800',
    purchaser: 'bg-blue-100 text-blue-800',
    warehouse_manager: 'bg-orange-100 text-orange-800',
    finance: 'bg-green-100 text-green-800',
  };
  return map[role] ?? 'bg-gray-100 text-gray-800';
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
