import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSearchController } from './searchController';

interface DeferredResponse {
  url: string;
  signal?: AbortSignal;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
}

describe('Request race condition handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts the earlier slow request via AbortSignal and displays only the later faster request result', async () => {
    const requests: DeferredResponse[] = [];

    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const entry: DeferredResponse = {
            url,
            signal: init?.signal,
            resolve,
            reject,
          };
          requests.push(entry);

          init?.signal?.addEventListener('abort', () => {
            reject(
              new DOMException('The user aborted a request.', 'AbortError'),
            );
          });
        });
      });

    vi.stubGlobal('fetch', fetchMock);

    const controller = createSearchController(() => {}, 300);
    controller.handleInput('sp');
    vi.advanceTimersByTime(300);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('/sp');

    controller.handleInput('spain');
    expect(requests[0].signal?.aborted).toBe(true);

    vi.advanceTimersByTime(300);
    expect(requests).toHaveLength(2);
    expect(requests[1].url).toContain('/spain');

    requests[1].resolve({
      ok: true,
      status: 200,
      json: async () => [
        {
          name: 'Spain',
          capital: 'Madrid',
          region: 'Europe',
          population: 47351567,
        },
      ],
    } as unknown as Response);

    await Promise.resolve();
    await Promise.resolve();

    requests[0].resolve({
      ok: true,
      status: 200,
      json: async () => [
        {
          name: 'Singapore',
          capital: 'Singapore',
          region: 'Asia',
          population: 5685807,
        },
      ],
    } as unknown as Response);

    await vi.runAllTimersAsync();

    const finalState = controller.getState();
    expect(finalState.status).toBe('success');
    expect(finalState.query).toBe('spain');
    expect(finalState.results).toHaveLength(1);
    expect(finalState.results[0].name).toBe('Spain');
  });
});
