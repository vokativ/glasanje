import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TARGET_DEADLINE_MS,
  isDeadlinePassed,
  shouldSkipPending,
  calculateRemaining,
  normalizePathname,
  decideAdmission,
  computeNextStatusDelay,
  MDULS_NOTICE_URL,
  MDULS_VOTER_REGISTRY_URL,
  GITHUB_REPO_URL,
} from '../src/lib/deadline';
import { StepPersonalInfo } from '../src/components/StepPersonalInfo';
import {
  synchronizeServerTime,
  readCurrentTime,
  ServerTimeSample,
} from '../src/lib/serverTime';
import { PostDeadlineNotice } from '../src/components/PostDeadlineNotice';
import { Countdown } from '../src/components/Countdown';
import { RegistrationEmailStatusPage } from '../src/components/RegistrationEmailStatusPage';
import { ScriptProvider } from '../src/lib/script';

describe('Deadline calculation and boundary rules', () => {
  test('TARGET_DEADLINE_MS corresponds exactly to 2026-10-03T22:00:00Z', () => {
    const isoString = new Date(TARGET_DEADLINE_MS).toISOString();
    expect(isoString).toBe('2026-10-03T22:00:00.000Z');
  });

  test('isDeadlinePassed boundary conditions (T-1ms, T, T+1ms)', () => {
    expect(isDeadlinePassed(TARGET_DEADLINE_MS - 1)).toBe(false);
    expect(isDeadlinePassed(TARGET_DEADLINE_MS)).toBe(true);
    expect(isDeadlinePassed(TARGET_DEADLINE_MS + 1)).toBe(true);
  });

  test('shouldSkipPending enables instant wizard admission when > 1 hour before deadline', () => {
    // 2 hours before deadline -> skip pending (instant open)
    expect(shouldSkipPending(TARGET_DEADLINE_MS - 7200_000)).toBe(true);
    // 61 minutes before deadline -> skip pending
    expect(shouldSkipPending(TARGET_DEADLINE_MS - 3660_000)).toBe(true);
    // Exactly 60 minutes before deadline -> do not skip pending (start pending to sync)
    expect(shouldSkipPending(TARGET_DEADLINE_MS - 3600_000)).toBe(false);
    // 30 minutes before deadline -> do not skip pending
    expect(shouldSkipPending(TARGET_DEADLINE_MS - 1800_000)).toBe(false);
    // After deadline -> do not skip pending
    expect(shouldSkipPending(TARGET_DEADLINE_MS + 1000)).toBe(false);
  });

  test('calculateRemaining returns exact countdown values and clamps to zero on expiry', () => {
    // 1 day, 2 hours, 3 minutes, 4 seconds before target
    const diffMs = (24 + 2) * 3600_000 + 3 * 60_000 + 4 * 1000;
    const nowMs = TARGET_DEADLINE_MS - diffMs;
    const remaining = calculateRemaining(TARGET_DEADLINE_MS, nowMs);

    expect(remaining.isExpired).toBe(false);
    expect(remaining.days).toBe(1);
    expect(remaining.hours).toBe(2);
    expect(remaining.minutes).toBe(3);
    expect(remaining.seconds).toBe(4);

    // Exact deadline instant
    const atDeadline = calculateRemaining(TARGET_DEADLINE_MS, TARGET_DEADLINE_MS);
    expect(atDeadline.isExpired).toBe(true);
    expect(atDeadline.days).toBe(0);
    expect(atDeadline.hours).toBe(0);
    expect(atDeadline.minutes).toBe(0);
    expect(atDeadline.seconds).toBe(0);

    // After deadline
    const afterDeadline = calculateRemaining(TARGET_DEADLINE_MS, TARGET_DEADLINE_MS + 100_000);
    expect(afterDeadline.isExpired).toBe(true);
    expect(afterDeadline.days).toBe(0);
    expect(afterDeadline.hours).toBe(0);
    expect(afterDeadline.minutes).toBe(0);
    expect(afterDeadline.seconds).toBe(0);
  });
});

describe('Route normalization', () => {
  test('normalizePathname handles slashes, casing, and fallback', () => {
    expect(normalizePathname('/status')).toBe('/status');
    expect(normalizePathname('/status/')).toBe('/status');
    expect(normalizePathname('/STATUS')).toBe('/status');
    expect(normalizePathname('/Status/')).toBe('/status');
    expect(normalizePathname('/status///')).toBe('/status');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('///')).toBe('/');
    expect(normalizePathname('')).toBe('/');

    // Other paths must not be accidentally normalized into /status
    expect(normalizePathname('/status-page')).toBe('/status-page');
    expect(normalizePathname('/api/status')).toBe('/api/status');
  });
});

describe('Admission decision pure logic (decideAdmission)', () => {
  test('status route is always admitted as status', () => {
    expect(
      decideAdmission({
        isStatusRoute: true,
        hasProgress: false,
        serverTimeConfirmed: true,
        nowMs: TARGET_DEADLINE_MS + 1000,
      }),
    ).toBe('status');
  });

  test('in-progress sessions are never closed, preserving applicant state', () => {
    expect(
      decideAdmission({
        isStatusRoute: false,
        hasProgress: true,
        serverTimeConfirmed: true,
        nowMs: TARGET_DEADLINE_MS + 1000,
      }),
    ).toBe('open');
  });

  test('user engagement on step 2 preserves admission when background sync resolves post-deadline', () => {
    let progressSignaled = false;
    const handleProgress = () => {
      progressSignaled = true;
    };

    // Render StepPersonalInfo with onProgress callback
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(StepPersonalInfo, {
          initialData: {
            fullName: 'Petar Petrović',
            parentName: '',
            jmbg: '',
            serbianAddress: '',
            phone: '',
            email: '',
          },
          onBack: () => undefined,
          onNext: () => undefined,
          onProgress: handleProgress,
        }),
      ),
    );

    expect(markup).toContain('id="fullName"');

    // Invoking the progress callback simulates user interaction in StepPersonalInfo
    handleProgress();
    expect(progressSignaled).toBe(true);

    // When engagement is signaled, decideAdmission preserves the form even post-deadline
    const decisionWithEngagement = decideAdmission({
      isStatusRoute: false,
      hasProgress: progressSignaled,
      serverTimeConfirmed: true,
      nowMs: TARGET_DEADLINE_MS + 60_000,
    });
    expect(decisionWithEngagement).toBe('open');

    // Pristine untouched visits without engagement close once server time confirms deadline
    const decisionWithoutEngagement = decideAdmission({
      isStatusRoute: false,
      hasProgress: false,
      serverTimeConfirmed: true,
      nowMs: TARGET_DEADLINE_MS + 60_000,
    });
    expect(decisionWithoutEngagement).toBe('closed');
  });

  test('computeNextStatusDelay calculates production boundary delays and self-re-arms correctly', () => {
    // 1. T-2 hours: delay is capped at 1 hour (3600_000 ms)
    const twoHoursBefore = TARGET_DEADLINE_MS - 2 * 3600_000;
    expect(computeNextStatusDelay(twoHoursBefore)).toBe(3600_000);

    // 2. T-1 hour (wake up from first timer): delay is capped at 1 hour (3600_000 ms)
    const oneHourBefore = TARGET_DEADLINE_MS - 3600_000;
    expect(computeNextStatusDelay(oneHourBefore)).toBe(3600_000);

    // 3. T-15 minutes (within 1 hour): delay is exactly 15 minutes + 100ms buffer
    const fifteenMinsBefore = TARGET_DEADLINE_MS - 15 * 60_000;
    expect(computeNextStatusDelay(fifteenMinsBefore)).toBe(15 * 60_000 + 100);

    // 4. At or past deadline: no timer scheduled (switches to archive mode)
    expect(computeNextStatusDelay(TARGET_DEADLINE_MS)).toBeNull();
    expect(computeNextStatusDelay(TARGET_DEADLINE_MS + 5000)).toBeNull();
  });

  test('unconfirmed server time fails open to avoid false lockouts', () => {
    expect(
      decideAdmission({
        isStatusRoute: false,
        hasProgress: false,
        serverTimeConfirmed: false,
        nowMs: TARGET_DEADLINE_MS + 1000,
      }),
    ).toBe('open');
  });

  test('fresh visitors after deadline with confirmed time are closed', () => {
    expect(
      decideAdmission({
        isStatusRoute: false,
        hasProgress: false,
        serverTimeConfirmed: true,
        nowMs: TARGET_DEADLINE_MS,
      }),
    ).toBe('closed');

    expect(
      decideAdmission({
        isStatusRoute: false,
        hasProgress: false,
        serverTimeConfirmed: true,
        nowMs: TARGET_DEADLINE_MS + 5000,
      }),
    ).toBe('closed');
  });

  test('fresh visitors before deadline with confirmed time are open', () => {
    expect(
      decideAdmission({
        isStatusRoute: false,
        hasProgress: false,
        serverTimeConfirmed: true,
        nowMs: TARGET_DEADLINE_MS - 1000,
      }),
    ).toBe('open');
  });
});

describe('Server time synchronization and clock skew handling', () => {
  test('synchronizeServerTime parses valid HTTP Date header and computes offset', async () => {
    const mockServerEpoch = Date.parse('2026-10-03T21:55:00Z');
    const mockClientWall = Date.parse('2026-10-03T21:50:00Z'); // client is 5 minutes behind
    const mockMonotonic = 12345.6;

    const mockFetch = async () =>
      new Response(null, {
        status: 200,
        headers: { date: new Date(mockServerEpoch).toUTCString() },
      });

    const sample = await synchronizeServerTime({
      origin: 'https://example.com',
      fetchFn: mockFetch as unknown as typeof fetch,
      wallClockFn: () => mockClientWall,
      monotonicClockFn: () => mockMonotonic,
    });

    expect(sample).not.toBeNull();
    expect(sample!.serverEpochMs).toBe(mockServerEpoch);
    expect(sample!.offsetMs).toBe(mockServerEpoch - mockClientWall);
    expect(sample!.receivedMonotonicMs).toBe(mockMonotonic);
  });

  test('readCurrentTime advances monotonically using performance.now', () => {
    const sample: ServerTimeSample = {
      serverEpochMs: 100000,
      receivedMonotonicMs: 5000,
      receivedWallMs: 90000,
      offsetMs: 10000,
    };

    // 2500ms monotonic elapsed since sample receipt
    const reading = readCurrentTime(sample, 92500, 7500);
    expect(reading.source).toBe('server');
    expect(reading.nowMs).toBe(102500);
  });

  test('synchronizeServerTime fails open on network errors, non-200, or missing Date header', async () => {
    // 500 response
    const fetch500 = async () => new Response(null, { status: 500 });
    const sample500 = await synchronizeServerTime({
      origin: 'https://example.com',
      fetchFn: fetch500 as unknown as typeof fetch,
    });
    expect(sample500).toBeNull();

    // Missing date header
    const fetchNoDate = async () => new Response(null, { status: 200 });
    const sampleNoDate = await synchronizeServerTime({
      origin: 'https://example.com',
      fetchFn: fetchNoDate as unknown as typeof fetch,
    });
    expect(sampleNoDate).toBeNull();

    // Network rejection
    const fetchError = async () => {
      throw new Error('Network error');
    };
    const sampleError = await synchronizeServerTime({
      origin: 'https://example.com',
      fetchFn: fetchError as unknown as typeof fetch,
    });
    expect(sampleError).toBeNull();
  });
});

describe('PostDeadlineNotice presentation component', () => {
  test('variant="closed" renders all required official links, headings, and disclaimer', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'cyrillic' },
        React.createElement(PostDeadlineNotice, { variant: 'closed' }),
      ),
    );

    // Must render the primary closed notice heading
    expect(html).toContain('Рок за пријаву за гласање из иностранства је истекао');
    // Must contain MDULS notice link
    expect(html).toContain(MDULS_NOTICE_URL);
    // Must contain Single Voter Register link
    expect(html).toContain(MDULS_VOTER_REGISTRY_URL);
    // Must contain /status link
    expect(html).toContain('/status');
    // Must contain GitHub repository link
    expect(html).toContain(GITHUB_REPO_URL);
    // Must include external link security attributes
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  test('variant="closed" renders accurately in Latin script', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(PostDeadlineNotice, { variant: 'closed' }),
      ),
    );

    expect(html).toContain('Rok za prijavu za glasanje iz inostranstva je istekao');
    expect(html).toContain('/status?script=latin');
    expect(html).toContain('3. oktobar 2026. u 24:00 (ponoć po vremenu u Srbiji)');
  });

  test('variant="advisory" renders static live-region banner without ticker noise', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(PostDeadlineNotice, {
          variant: 'advisory',
          timeConfirmed: true,
        }),
      ),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('Zvanični rok za prijavu je istekao');
    expect(html).toContain('Možete dovršiti obrazac i preuzeti PDF');
  });
});

describe('RegistrationEmailStatusPage archive mode', () => {
  test('isArchive=true renders archive title and back link while omitting registration CTAs', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(RegistrationEmailStatusPage, { isArchive: true }),
      ),
    );

    // Archive header
    expect(html).toContain('Arhiva zvaničnih i-mejl adresa misija (Izbori 2026)');
    expect(html).toContain('Početna stranica');

    // Registration CTA button should be omitted in archive mode
    expect(html).not.toContain('Započnite prijavu za ovu državu');

    // Diplomatic missions and official data remain present
    expect(html).toContain('coverage-list');
  });

  test('isArchive=true preserves unconfirmed mission emails (e.g. Afghanistan / Tehran)', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(RegistrationEmailStatusPage, { isArchive: true }),
      ),
    );

    // Unconfirmed covering mission email must be visible as public contact
    expect(html).toContain('konzularno@serbiatehran.com');
    expect(html).toContain('Javni kontakt misije:');
    // Pre-composed inquiry composer link and CTA must be omitted in archive mode
    expect(html).not.toContain('Pitajte misiju za uputstvo');
    expect(html).not.toContain('mailto:konzularno@serbiatehran.com');
  });

  test('isArchive=false renders active registration view with registration CTAs', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(RegistrationEmailStatusPage, { isArchive: false }),
      ),
    );

    expect(html).toContain('Potvrđene izborne i-mejl adrese');
    expect(html).toContain('Nazad na prijavu za glasanje');
    expect(html).toContain('Započnite prijavu za ovu državu');
    expect(html).toContain('mailto:konzularno@serbiatehran.com');
  });
});

describe('Countdown component with props', () => {
  test('renders countdown when not expired', () => {
    const preDeadlineMs = TARGET_DEADLINE_MS - 3600_000;
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(Countdown, { nowMs: preDeadlineMs }),
      ),
    );

    expect(html).toContain('countdown-grid');
    expect(html).toContain('countdown-num');
  });

  test('renders expired notice when nowMs is at or past deadline', () => {
    const postDeadlineMs = TARGET_DEADLINE_MS + 1000;
    const html = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(Countdown, { nowMs: postDeadlineMs, timeSource: 'server' }),
      ),
    );

    expect(html).not.toContain('countdown-grid');
    expect(html).toContain('Zvanični rok za prijavu je istekao');
  });
});
