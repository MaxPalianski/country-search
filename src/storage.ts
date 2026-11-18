const HISTORY_STORAGE_KEY = 'country-search-history';
const MAX_HISTORY_ITEMS = 6;

export function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function saveSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadSearchHistory();

  const existing = loadSearchHistory();
  const filtered = existing.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }

  return updated;
}
