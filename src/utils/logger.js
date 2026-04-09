const levels = ['debug', 'info', 'warn', 'error'];
const minLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const idx = levels.indexOf(minLevel);
const threshold = idx === -1 ? 1 : idx;

function log(level, ...args) {
  const li = levels.indexOf(level);
  if (li >= threshold) {
    const fn = level === 'error' ? console.error : console.log;
    fn(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, ...args);
  }
}

export default {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
};
