/**
 * PBLMS — Data Formatters
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Centralized formatting utilities for dates, numbers, and other
 * data types used throughout the UI.
 */

/**
 * Format a date string or timestamp to a readable date string.
 *
 * @param {string|Date|number} value — Date value
 * @param {Object} [options] — Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  const localeOptions = { year: 'numeric', month: 'short', day: 'numeric', ...options };
  return new Intl.DateTimeFormat('en-US', localeOptions).format(date);
}

/**
 * Format a date to ISO date string (YYYY-MM-DD).
 *
 * @param {string|Date} value
 * @returns {string}
 */
export function formatDateISO(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Format a timestamp to a datetime string with time.
 *
 * @param {string|Date|number} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a number with locale-specific separators and optional decimals.
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a duration in minutes to a human-readable string.
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a percentage value.
 *
 * @param {number} value — Decimal value (e.g., 0.875 for 87.5%)
 * @returns {string}
 */
export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export default { formatDate, formatDateISO, formatDateTime, formatNumber, formatDuration, formatPercent };