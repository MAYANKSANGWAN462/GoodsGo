import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formats a date string for display.
 * @param {string|Date} date
 * @param {string} [pattern='dd MMM yyyy']
 * @returns {string}
 */
export function formatDate(date, pattern = 'dd MMM yyyy') {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

/**
 * Returns a relative time string ("2 hours ago").
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Formats a number as Indian Rupees.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Formats a distance in km.
 * @param {number} km
 * @returns {string}
 */
export function formatDistance(km) {
  if (km === null || km === undefined) return '';
  return `${Number(km).toFixed(1)} km`;
}
