type CachedEntry<T> = {
  value: T;
  expiresAt: number;
};

export const readCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

export const writeCache = <T>(key: string, value: T, ttlMs: number) => {
  try {
    const payload: CachedEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
};
