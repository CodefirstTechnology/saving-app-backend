/**
 * Builds an absolute URL for files served under `app.use('/uploads', ...)`.
 * Set `PUBLIC_BASE_URL` (e.g. https://api.example.com) in production.
 */
export function publicUrlForPath(relativePath) {
  if (!relativePath) return null;
  const base = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  if (!base) return path;
  return `${base}${path}`;
}
