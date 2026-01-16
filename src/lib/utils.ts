import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get value from object using dot-notation path
 * Supports paths like: "/form/email" or "form.email" or "items[0].name"
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path || !obj) return undefined;

  // Normalize path: remove leading slash, convert to dot notation
  const normalizedPath = path
    .replace(/^\//, '')
    .replace(/\//g, '.')
    .replace(/\[(\d+)\]/g, '.$1');

  const keys = normalizedPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Set value in object using dot-notation path
 * Creates nested objects as needed
 */
export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) return;

  // Normalize path
  const normalizedPath = path
    .replace(/^\//, '')
    .replace(/\//g, '.')
    .replace(/\[(\d+)\]/g, '.$1');

  const keys = normalizedPath.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      // Create array if next key is numeric, otherwise object
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = str;
    return div.innerHTML;
  }
  // Server-side fallback
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, includeTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return d.toLocaleString('pt-BR', options);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate a simple unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
