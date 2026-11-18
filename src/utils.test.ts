import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './utils';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution until delay has elapsed', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('spain');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spain');
  });

  it('resets the timer when called again before delay expires', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('s');
    vi.advanceTimersByTime(200);
    debounced('sp');
    vi.advanceTimersByTime(200);
    debounced('spain');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spain');
  });
});
