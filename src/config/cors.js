/** Extra dev URLs when `CORS_INCLUDE_DEV_ORIGINS=true` (in addition to localhost regex). */
const DEFAULT_DEV_BROWSER_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Pages served from the machine (Expo web, Vite, etc.). Browsers set this Origin; remote sites cannot spoof it.
 * Matches any port so 8081 / 8082 / 19006 / … all work without editing Vercel env.
 */
const LOCAL_LOOPBACK_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function envFlag(name) {
  const v = (process.env[name] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function parseAllowList() {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw) return [];
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

/**
 * `origin` option for the `cors` package.
 *
 * Why CORS errors happen: the browser sends `Origin: http://localhost:8081`. If that value is not allowed,
 * the server omits `Access-Control-Allow-Origin` and the browser blocks the response (often after OPTIONS).
 *
 * - No `CORS_ORIGIN` → reflect any origin (`true`).
 * - `CORS_ORIGIN` set → allow those URLs **plus** loopback browser origins (localhost / 127.0.0.1 / ::1, any port),
 *   unless `CORS_STRICT_NO_LOCALHOST=true`.
 * - `CORS_INCLUDE_DEV_ORIGINS=true` → also allow the fixed DEFAULT_DEV_BROWSER_ORIGINS list (e.g. tunnel URLs).
 */
export function getCorsOriginOption() {
  /**
   * Local `npm start` / `npm run dev` usually has NODE_ENV unset (not "production").
   * Reflect any Origin so Expo web, tunnel URLs, and LAN IPs (192.168.x) all work.
   * Vercel sets NODE_ENV=production — then the allowlist rules below apply.
   */
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const allowList = parseAllowList();
  if (allowList.length === 0) {
    return true;
  }

  const strictNoLocalhost = envFlag('CORS_STRICT_NO_LOCALHOST');
  const includeDevList = envFlag('CORS_INCLUDE_DEV_ORIGINS');
  const devSet = includeDevList ? new Set(DEFAULT_DEV_BROWSER_ORIGINS) : null;

  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowList.includes(origin)) {
      return callback(null, true);
    }
    if (!strictNoLocalhost && LOCAL_LOOPBACK_ORIGIN_RE.test(origin)) {
      return callback(null, true);
    }
    if (devSet?.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  };
}
