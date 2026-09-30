/**
 * Shared election registration deadline configuration, pure calculation helpers,
 * and routing normalization utilities.
 */

// Published official deadline for registering to vote from abroad:
// October 3, 2026 at 24:00 (midnight) Belgrade time (UTC+2 / CEST).
// Stored as UTC instant (22:00:00Z) so calculations remain timezone-independent.
export const TARGET_DEADLINE_MS = Date.parse('2026-10-03T22:00:00Z');

// Official election notices and resources
export const MDULS_NOTICE_URL =
  'https://mduls.gov.rs/obavestenja/obavestava-birace-koji-imaju-boraviste-u-inostranstvu-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine/';
export const MDULS_VOTER_REGISTRY_URL = 'https://upit.birackispisak.gov.rs/';
export const GITHUB_REPO_URL = 'https://github.com/vokativ/glasanje';

// Display representation of the deadline in Serbian
export const DEADLINE_DISPLAY_SR_CYR = '3. октобар 2026. у 24:00 (поноћ по времену у Србији)';
export const DEADLINE_DISPLAY_SR_LAT = '3. oktobar 2026. u 24:00 (ponoć po vremenu u Srbiji)';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Returns true if the provided timestamp is at or past the deadline.
 */
export function isDeadlinePassed(nowMs: number): boolean {
  return nowMs >= TARGET_DEADLINE_MS;
}

/**
 * Returns true if local device time is safely before the deadline window (more than 1 hour before),
 * allowing immediate admission without waiting for network server-time synchronization.
 */
export function shouldSkipPending(localNowMs: number): boolean {
  // If more than 60 minutes before the deadline, device clock is safely pre-deadline
  return localNowMs < TARGET_DEADLINE_MS - 3600_000;
}
/**
 * Pure countdown arithmetic clamped to 0 when expired.
 */
export function calculateRemaining(targetMs: number, nowMs: number = Date.now()): TimeRemaining {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false };
}

/**
 * Normalizes URL pathname for route checks:
 * - strips trailing slashes
 * - converts to lowercase
 * - falls back to '/'
 */
export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '').toLowerCase();
  return trimmed || '/';
}

export type AdmissionState = 'pending' | 'open' | 'closed';

export interface AdmissionDecisionInput {
  isStatusRoute: boolean;
  hasProgress: boolean;
  serverTimeConfirmed: boolean;
  nowMs: number;
}

/**
 * Pure admission decision for the initial page mount.
 * Precedence:
 * 1. Status route -> always accessible as archive/directory.
 * 2. In-progress sessions -> always kept open so user data is never lost.
 * 3. Unconfirmed time -> fails open (open) to avoid false lockouts.
 * 4. Confirmed time at or past deadline -> closed.
 * 5. Pre-deadline -> open.
 */
export function decideAdmission(input: AdmissionDecisionInput): 'status' | 'open' | 'closed' {
  if (input.isStatusRoute) {
    return 'status';
  }
  if (input.hasProgress) {
    return 'open';
  }
  if (!input.serverTimeConfirmed) {
    // Fail-open: do not close if server time could not be confirmed
    return 'open';
  }
  if (isDeadlinePassed(input.nowMs)) {
    return 'closed';
  }
  return 'open';
}

/**
 * Computes the delay in milliseconds for the status page archive transition timer.
 * Returns null if the deadline has already passed (no timer needed).
 * If more than 1 hour remains, caps delay at 1 hour (3600_000ms) to ensure periodic re-checks.
 * If 1 hour or less remains, schedules for exact remaining time plus a 100ms buffer.
 */
export function computeNextStatusDelay(
  currentNow: number,
  targetDeadlineMs: number = TARGET_DEADLINE_MS,
): number | null {
  const msUntilDeadline = targetDeadlineMs - currentNow;
  if (msUntilDeadline <= 0) return null;
  return Math.min(msUntilDeadline + 100, 3600_000);
}
