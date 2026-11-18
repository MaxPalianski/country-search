import { HttpError, searchCountries } from './api';
import type { ClassifiedError, Country, SearchState } from './types';
import { debounce } from './utils';

const DEFAULT_DEBOUNCE_MS = 350;

export function classifySearchError(error: unknown): ClassifiedError {
  if (error instanceof DOMException) {
    if (error.name === 'AbortError') {
      return { kind: 'abort', message: '' };
    }
    if (error.name === 'TimeoutError') {
      return {
        kind: 'timeout',
        message:
          'Request timed out. Please check your connection and try again.',
      };
    }
  }

  if (error instanceof HttpError) {
    return {
      kind: 'http',
      message: `Server error (${error.status}). Please try again.`,
    };
  }

  return {
    kind: 'network',
    message: 'Network error. Please check your internet connection and retry.',
  };
}

interface InFlightEntry {
  promise: Promise<Country[]>;
  networkController: AbortController;
  subscribers: number;
}

function subscribeToInFlight(
  entry: InFlightEntry,
  callerSignal: AbortSignal,
  onAllAborted: () => void,
): Promise<Country[]> {
  if (callerSignal.aborted) {
    entry.subscribers -= 1;
    if (entry.subscribers <= 0) {
      entry.networkController.abort();
      onAllAborted();
    }
    return Promise.reject(
      new DOMException('The operation was aborted.', 'AbortError'),
    );
  }

  return new Promise<Country[]>((resolve, reject) => {
    const onAbort = (): void => {
      entry.subscribers -= 1;
      if (entry.subscribers <= 0) {
        entry.networkController.abort();
        onAllAborted();
      }
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    callerSignal.addEventListener('abort', onAbort, { once: true });

    entry.promise.then(
      (value) => {
        callerSignal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        callerSignal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

export interface SearchController {
  handleInput: (rawQuery: string) => void;
  searchNow: (rawQuery: string) => Promise<void>;
  retry: () => Promise<void>;
  getState: () => SearchState;
}

export function createSearchController(
  onStateChange: (state: SearchState) => void,
  debounceMs = DEFAULT_DEBOUNCE_MS,
): SearchController {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, InFlightEntry>();

  let activeAbortController: AbortController | null = null;
  let lastQuery = '';

  let state: SearchState = {
    status: 'idle',
    query: '',
    results: [],
    errorMessage: null,
  };

  const emit = (next: SearchState): void => {
    state = next;
    onStateChange(state);
  };

  const abortCurrentRequest = (): void => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  };

  const fetchWithCacheAndDedup = (
    normalizedKey: string,
    query: string,
    callerSignal: AbortSignal,
  ): Promise<Country[]> => {
    const cached = cache.get(normalizedKey);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let entry = inFlight.get(normalizedKey);
    if (!entry) {
      const networkController = new AbortController();
      const promise = searchCountries(query, networkController.signal)
        .then((countries) => {
          cache.set(normalizedKey, countries);
          return countries;
        })
        .finally(() => {
          if (
            inFlight.get(normalizedKey)?.networkController === networkController
          ) {
            inFlight.delete(normalizedKey);
          }
        });

      entry = {
        promise,
        networkController,
        subscribers: 0,
      };
      inFlight.set(normalizedKey, entry);
    }

    entry.subscribers += 1;
    const currentEntry = entry;

    return subscribeToInFlight(currentEntry, callerSignal, () => {
      if (inFlight.get(normalizedKey) === currentEntry) {
        inFlight.delete(normalizedKey);
      }
    });
  };

  const executeSearch = async (
    rawQuery: string,
    bypassCache = false,
  ): Promise<void> => {
    const trimmed = rawQuery.trim();
    lastQuery = trimmed;

    abortCurrentRequest();

    if (!trimmed) {
      emit({
        status: 'idle',
        query: '',
        results: [],
        errorMessage: null,
      });
      return;
    }

    const normalizedKey = trimmed.toLowerCase();
    const controller = new AbortController();
    activeAbortController = controller;

    if (!bypassCache && cache.has(normalizedKey)) {
      const cached = cache.get(normalizedKey) ?? [];
      emit({
        status: cached.length > 0 ? 'success' : 'empty',
        query: trimmed,
        results: cached,
        errorMessage: null,
      });
      return;
    }

    emit({
      status: 'loading',
      query: trimmed,
      results: [],
      errorMessage: null,
    });

    try {
      const countries = bypassCache
        ? await searchCountries(trimmed, controller.signal).then((res) => {
            cache.set(normalizedKey, res);
            return res;
          })
        : await fetchWithCacheAndDedup(
            normalizedKey,
            trimmed,
            controller.signal,
          );

      if (controller.signal.aborted) {
        return;
      }

      emit({
        status: countries.length > 0 ? 'success' : 'empty',
        query: trimmed,
        results: countries,
        errorMessage: null,
      });
    } catch (error: unknown) {
      const classified = classifySearchError(error);
      if (classified.kind === 'abort' || controller.signal.aborted) {
        return;
      }

      emit({
        status: 'error',
        query: trimmed,
        results: [],
        errorMessage: classified.message,
      });
    }
  };

  const debouncedExecute = debounce((query: string) => {
    void executeSearch(query, false);
  }, debounceMs);

  const handleInput = (rawQuery: string): void => {
    const trimmed = rawQuery.trim();
    lastQuery = trimmed;

    abortCurrentRequest();

    if (!trimmed) {
      debouncedExecute('');
      emit({
        status: 'idle',
        query: '',
        results: [],
        errorMessage: null,
      });
      return;
    }

    debouncedExecute(trimmed);
  };

  const searchNow = async (rawQuery: string): Promise<void> => {
    await executeSearch(rawQuery, false);
  };

  const retry = async (): Promise<void> => {
    if (!lastQuery) return;
    await executeSearch(lastQuery, true);
  };

  return {
    handleInput,
    searchNow,
    retry,
    getState: () => state,
  };
}
