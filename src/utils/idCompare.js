/**
 * Normalize ids for comparison: UUID strings, 32-char hex, 16-byte Buffer (MySQL BINARY UUID).
 */
export function normalizeEntityId(v) {
  if (v == null) return '';
  if (Buffer.isBuffer(v)) {
    if (v.length === 16) {
      const h = v.toString('hex');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`.toLowerCase();
    }
    return v.toString('utf8').trim().toLowerCase();
  }
  let s = String(v).trim().toLowerCase();
  if (s.length === 32 && /^[0-9a-f]{32}$/i.test(s)) {
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  return s;
}

export function sameId(a, b) {
  const na = normalizeEntityId(a);
  const nb = normalizeEntityId(b);
  return na.length > 0 && nb.length > 0 && na === nb;
}
