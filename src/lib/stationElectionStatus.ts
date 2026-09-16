import type { PollingStation } from '../data/missions';

export type ElectionContactApproval = PollingStation['electionContactApproval'];
export type StationElectionStatus = 'approved' | 'notice-no-email' | 'unconfirmed';

export type StationElectionContext = Pick<PollingStation, 'electionContactApproval' | 'electionNotice'>;
export type StationRecipientContext = Pick<PollingStation, 'email' | 'electionContactApproval' | 'electionNotice'>;

export const CURRENT_ELECTION_YEAR = '2026';

/**
 * Checks whether the mission's recipient email is approved (source-confirmed or operator-approved).
 * Uses positive membership check to prevent accidental approval inflation.
 */
export function isElectionRecipientApproved(approval: ElectionContactApproval): boolean {
  return approval === 'source-confirmed' || approval === 'operator-approved';
}

/**
 * Derives the station's presentation status:
 * - 'approved': recipient email is approved (source-confirmed or operator-approved)
 * - 'notice-no-email': recipient is unconfirmed, but an official notice for the current election
 *                      exists and has no extracted email (yellow/fallback state)
 * - 'unconfirmed': unconfirmed with no notice (or not-published)
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
