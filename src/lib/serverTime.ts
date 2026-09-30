/**
 * Server-time synchronization via same-origin HTTP Date header sampling.
 * Mitigates client-side clock skew while failing open if network/server time
 * cannot be reliably confirmed.
 */

export interface ServerTimeSample {
  serverEpochMs: number;
  receivedMonotonicMs: number;
  receivedWallMs: number;
  offsetMs: number;
}

export interface SynchronizeOptions {
  origin?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  wallClockFn?: () => number;
  monotonicClockFn?: () => number;
}

/**
 * Samples current server time from the origin HTTP `Date` response header.
 * Uses a HEAD request to avoid downloading HTML or triggering SW caching.
 * Returns null if network fails, times out, or header is missing/invalid.
 */
export async function synchronizeServerTime(
  options: SynchronizeOptions = {},
): Promise<ServerTimeSample | null> {
  const {
    origin = typeof window !== 'undefined' ? window.location.origin : '',
    timeoutMs = 3000,
    fetchFn = typeof fetch !== 'undefined' ? fetch : undefined,
    wallClockFn = () => Date.now(),
    monotonicClockFn = () => (typeof performance !== 'undefined' ? performance.now() : 0),
  } = options;

  if (!fetchFn || !origin) {
    return null;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // Ignore cancellation errors
        }
      }, timeoutMs)
    : undefined;

  try {
    // Unique query parameter prevents edge caching of the HEAD response
    const requestUrl = `${origin}/?__time=${wallClockFn()}`;
    const response = await fetchFn(requestUrl, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      return null;
    }

    const dateHeader = response.headers.get('date');
    if (!dateHeader) {
      return null;
    }

    const serverEpochMs = Date.parse(dateHeader);
    if (!Number.isFinite(serverEpochMs)) {
      return null;
    }

    const receivedWallMs = wallClockFn();
    const receivedMonotonicMs = monotonicClockFn();
    const offsetMs = serverEpochMs - receivedWallMs;

    return {
      serverEpochMs,
      receivedMonotonicMs,
      receivedWallMs,
      offsetMs,
    };
  } catch {
    // Any error (timeout, network offline, DNS, abort) results in null -> fail-open
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Derives current time from an established ServerTimeSample and monotonic clock,
 * or falls back to local wall clock.
 */
export function readCurrentTime(
  sample: ServerTimeSample | null,
  wallNowMs = Date.now(),
  monotonicNowMs = typeof performance !== 'undefined' ? performance.now() : 0,
): { nowMs: number; source: 'server' | 'local' } {
  if (!sample) {
    return { nowMs: wallNowMs, source: 'local' };
  }

  const elapsedMonotonic = monotonicNowMs - sample.receivedMonotonicMs;
  if (!Number.isFinite(elapsedMonotonic) || elapsedMonotonic < 0) {
    // If monotonic clock is erratic, fall back to local wall clock + offset
    return { nowMs: wallNowMs + sample.offsetMs, source: 'server' };
  }

  return {
    nowMs: sample.serverEpochMs + elapsedMonotonic,
    source: 'server',
  };
}
