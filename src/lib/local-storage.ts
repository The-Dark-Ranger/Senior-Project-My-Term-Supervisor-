/** Small, SSR-safe helpers around `window.localStorage`. */

export function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): string {
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, raw);
  } catch (error) {
    console.error(`Could not save "${key}" to localStorage`, error);
  }
  return raw;
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode / blocked) - nothing to remove.
  }
}

/** Runs `callback` when another tab changes one of `keys`. */
export function onStorageKeyChange(keys: string[], callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === null || keys.includes(event.key)) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
