import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCountries, HttpError } from './api';

describe('searchCountries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches countries from countries.dev and maps them on 200 OK', async () => {
    const mockPayload = [
      {
        name: 'Spain',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        flags: { svg: 'https://flagcdn.com/es.svg' },
        languages: [{ name: 'Spanish' }],
        currencies: [{ name: 'Euro', symbol: '€' }],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const result = await searchCountries('spain', controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://countries.dev/name/spain');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Spain');
  });

  it('returns an empty array on 404 Not Found instead of throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const result = await searchCountries(
      'nonexistentcountry',
      controller.signal,
    );

    expect(result).toEqual([]);
  });

  it('throws HttpError with status on non-404 HTTP errors (e.g. 500)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();

    await expect(searchCountries('spain', controller.signal)).rejects.toThrow(
      HttpError,
    );

    try {
      await searchCountries('spain', controller.signal);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(500);
    }
  });
});
