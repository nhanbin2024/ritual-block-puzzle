type Entry = { value: string; expiresAt: number };
const store = new Map<string, Entry>();

function now() { return Date.now(); }
function secondsUntilTomorrowUTC() {
  const d = new Date();
  const tomorrow = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
  return Math.max(60, Math.ceil((tomorrow - d.getTime()) / 1000));
}

export async function checkOnceEver(key: string) {
  const old = store.get(key);
  if (old && old.expiresAt > now()) return false;
  store.set(key, { value: "1", expiresAt: now() + 3650 * 24 * 60 * 60 * 1000 });
  return true;
}

export async function checkOncePerDay(key: string) {
  const today = new Date().toISOString().slice(0, 10);
  const fullKey = `${key}:${today}`;
  const old = store.get(fullKey);
  if (old && old.expiresAt > now()) return false;
  store.set(fullKey, { value: "1", expiresAt: now() + secondsUntilTomorrowUTC() * 1000 });
  return true;
}
