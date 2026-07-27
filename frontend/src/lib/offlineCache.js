const CACHE_PREFIX = "nb_cache_";
const CACHE_MAX_AGE = 60 * 60 * 1000;

export function saveToCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      ts: Date.now(),
    }));
  } catch {}
}

export function loadFromCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > maxAge) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCache() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}
