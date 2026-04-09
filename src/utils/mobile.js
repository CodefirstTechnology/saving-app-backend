/**
 * Normalize Indian mobile for storage and lookup (digits only, last 10 if longer).
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeMobile(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function isValidMobileDigits(digits) {
  return typeof digits === 'string' && digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}
