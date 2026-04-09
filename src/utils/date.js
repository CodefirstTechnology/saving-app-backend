export function formatISO(d, part = 'full') {
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (part === 'date') return `${y}-${m}-${day}`;
  return d.toISOString();
}

export function addMonths(isoDate, months) {
  const [y, m, day] = String(isoDate).split('-').map(Number);
  const d = new Date(y, m - 1 + months, day);
  return formatISO(d, 'date');
}
