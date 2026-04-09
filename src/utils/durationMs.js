/** Parses simple duration strings: 30d, 12h, 15m, 60s. Defaults to 30d if invalid. */
export function durationToMs(input) {
  const s = String(input || '').trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (mult[u] || 86_400_000);
}
