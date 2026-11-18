import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifySearchError,
  createSearchController,
} from './searchController';
import { HttpError } from './api';
import type { SearchState } from './types';

describe('classifySearchError', () => {
  it('identifies DOMException AbortError as user-initiated abort (not an error)', () => {
    const err = new DOMException('The user aborted a request.', 'AbortError');
    expect(classifySearchError(err)).toEqual({
      kind: 'abort',
      message: '',
    });
  });

  it('identifies DOMException TimeoutError separately from AbortError', () => {
    const err = new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError',
    );
    const classified = classifySearchError(err);
    expect(classified.kind).toBe('timeout');
    expect(classified.message).toContain('timed out');
  });

  it('identifies HttpError with its status code', () => {
    const err = new HttpError(503, 'Service Unavailable');
    const classified = classifySearchError(err);
    expect(classified.kind).toBe('http');
    expect(classified.message).toContain('503');
  });

  it('identifies generic network TypeError as network error', () => {
    const err = new TypeError('Failed to fetch');
    const classified = classifySearchError(err);
    expect(classified.kind).toBe('network');
    expect(classified.message.length).toBeGreaterThan(0);
  });
});

describe('createSearchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts an in-flight request immediately when input changes before debounce fires', async () => {
    let firstSignal: AbortSignal | undefined;

    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        if (!firstSignal) {
          firstSignal = init?.signal;
        }
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = createSearchController(
      (state) => states.push(state),
      300,
    );

    controller.handleInput('sp');
    vi.advanceTimersByTime(300);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstSignal?.aborted).toBe(false);

    controller.handleInput('spa');
    expect(firstSignal?.aborted).toBe(true);

    await vi.runAllTimersAsync();

    expect(states.some((s) => s.status === 'error')).toBe(false);
  });
});
