import { mapCountryResponse } from './mapper';
import type { Country, RawCountry } from './types';

const API_BASE_URL = 'https://countries.dev/name';
const DEFAULT_TIMEOUT_MS = 8000;

export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `HTTP Error: ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

function createCombinedSignal(
  externalSignal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!externalSignal) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }

  const fallbackController = new AbortController();
  const onAbort = (reason: unknown): void => {
    fallbackController.abort(reason);
  };

  if (externalSignal.aborted) {
    onAbort(externalSignal.reason);
  } else {
    externalSignal.addEventListener(
      'abort',
      () => onAbort(externalSignal.reason),
      { once: true },
    );
  }

  timeoutSignal.addEventListener('abort', () => onAbort(timeoutSignal.reason), {
    once: true,
  });

  return fallbackController.signal;
}

export async function searchCountries(
  query: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Country[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const combinedSignal = createCombinedSignal(signal, timeoutMs);
  const url = `${API_BASE_URL}/${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, { signal: combinedSignal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Failed to fetch countries: ${response.status} ${response.statusText ?? ''}`.trim(),
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => mapCountryResponse(item as RawCountry));
}
