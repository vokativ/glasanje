import type { PollingStation } from '../data/missions';

export type ElectionContactApproval = PollingStation['electionContactApproval'];

/**
 * Derived presentation status for a mission in the UI:
 * - 'approved': Recipient email is explicitly approved ('source-confirmed' or 'operator-approved').
 *               Counts toward public recipient coverage (166 stations).
 * - 'notice-no-email': Mission published an official announcement for the current election, but
 *                      did not provide a dedicated election submission email. The general consular
 *                      mailbox is offered as an unguaranteed fallback attempt, with explicit warnings
 *                      to seek confirmation of receipt and verify registration on birackispisak.gov.rs.
 *                      Does NOT count toward approved coverage; approval remains 'unconfirmed'.
 * - 'unconfirmed': Mission has neither an approved election recipient nor a current election notice.
 */
export type StationElectionStatus = 'approved' | 'notice-no-email' | 'unconfirmed';

export type StationElectionContext = Pick<PollingStation, 'electionContactApproval' | 'electionNotice'>;
export type StationRecipientContext = Pick<PollingStation, 'email' | 'electionContactApproval' | 'electionNotice'>;

export const CURRENT_ELECTION_YEAR = '2026';

/**
 * Checks whether the mission's recipient email is approved (source-confirmed or operator-approved).
 * Uses positive membership check to prevent accidental approval inflation.
 *
 * Invariant: This predicate alone governs the public recipient coverage gate.
 * The derived 'notice-no-email' state MUST NOT satisfy this check.
 */
export function isElectionRecipientApproved(approval: ElectionContactApproval): boolean {
  return approval === 'source-confirmed' || approval === 'operator-approved';
}

/**
 * Derives the station's presentation status purely at runtime.
 *
 * This function implements Option B (derived, non-persisted presentation state) so that
 * stored data schemas (canonical JSON and PollingStation) remain untouched.
 *
 * Rules:
 * 1. An approved recipient always yields 'approved' regardless of notice metadata.
 * 2. An unconfirmed recipient with a current-year notice marked 'no-email-extracted' yields
 *    'notice-no-email' (yellow state).
 * 3. All other unconfirmed recipients (no notice, past election notice, or unapproved email-extracted
 *    notice awaiting review) yield 'unconfirmed' (red state).
 */
export function getStationElectionStatus(station: StationElectionContext): StationElectionStatus {
  if (isElectionRecipientApproved(station.electionContactApproval)) {
    return 'approved';
  }
  if (
    station.electionContactApproval === 'unconfirmed' &&
    station.electionNotice?.electionYear === CURRENT_ELECTION_YEAR &&
    station.electionNotice?.emailStatus === 'no-email-extracted'
  ) {
    return 'notice-no-email';
  }
  return 'unconfirmed';
}
