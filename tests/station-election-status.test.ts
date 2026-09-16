import { expect, test, describe } from 'bun:test';
import { COUNTRIES, COUNTRY_BY_CODE, PollingStation } from '../src/data/missions';
import {
  getStationElectionStatus,
  isElectionRecipientApproved,
} from '../src/lib/stationElectionStatus';
import { buildRecipientPayloads } from '../src/lib/share';
import { buildMissionInquiryUrl } from '../src/lib/missionInquiry';
import { getElectionEmailCoverage } from '../src/components/RegistrationEmailStatusPage';

describe('Station Election Status (Yellow State)', () => {
  test('isElectionRecipientApproved returns true only for source-confirmed and operator-approved', () => {
    expect(isElectionRecipientApproved('source-confirmed')).toBe(true);
    expect(isElectionRecipientApproved('operator-approved')).toBe(true);
    expect(isElectionRecipientApproved('unconfirmed')).toBe(false);
    // @ts-expect-error testing arbitrary input
    expect(isElectionRecipientApproved('other')).toBe(false);
  });

  test('getStationElectionStatus returns approved for approved recipients regardless of notice', () => {
    expect(getStationElectionStatus({ electionContactApproval: 'source-confirmed' })).toBe('approved');
    expect(getStationElectionStatus({ electionContactApproval: 'operator-approved' })).toBe('approved');
    expect(getStationElectionStatus({
      electionContactApproval: 'operator-approved',
      electionNotice: {
        url: 'https://example.com',
        title: 'Notice',
        electionYear: '2026',
        observedAt: '2026-09-16T01:00:00Z',
        emailStatus: 'no-email-extracted',
      },
    })).toBe('approved');
  });

  test('getStationElectionStatus returns notice-no-email only when unconfirmed, 2026 notice, and no-email-extracted', () => {
    const yellowStation = {
      electionContactApproval: 'unconfirmed' as const,
      electionNotice: {
        url: 'https://example.com/notice',
        title: 'Izbori 2026',
        electionYear: '2026',
        observedAt: '2026-09-16T01:00:00Z',
        emailStatus: 'no-email-extracted' as const,
      },
    };
    expect(getStationElectionStatus(yellowStation)).toBe('notice-no-email');

    // Past election year does not trigger yellow state
    expect(getStationElectionStatus({
      ...yellowStation,
      electionNotice: { ...yellowStation.electionNotice, electionYear: '2022' },
    })).toBe('unconfirmed');

    // email-extracted without approval does not trigger yellow state
    expect(getStationElectionStatus({
      ...yellowStation,
      electionNotice: { ...yellowStation.electionNotice, emailStatus: 'email-extracted' },
    })).toBe('unconfirmed');

    // No notice remains unconfirmed
    expect(getStationElectionStatus({ electionContactApproval: 'unconfirmed' })).toBe('unconfirmed');
  });

  test('exactly the 12 expected stations in the dataset resolve to notice-no-email', () => {
    const allStations: PollingStation[] = COUNTRIES.flatMap((c) => c.stations);
    const yellowStations = allStations.filter((s) => getStationElectionStatus(s) === 'notice-no-email');
    const expectedYellowIds: Record<string, true> = {
      'st-al-emb-main': true,
      'st-br-emb-main': true,
      'st-cu-emb-main': true,
      'st-ly-emb-main': true,
      'st-tn-emb-main': true,
      'st-tr-emb-main': true,
      'st-tr-cons-istanbul': true,
      'st-hr-cons-vukovar': true,
      'st-me-cons-hercegnovi': true,
      // Havana covered dependents
      'st-nonres-do': true,
      'st-nonres-jm': true,
      'st-nonres-ht': true,
    };

    expect(yellowStations.length).toBe(12);
    for (const s of yellowStations) {
      expect(expectedYellowIds[s.id]).toBe(true);
    }
  });

  test('total approved recipients in coverage remains exactly 166 out of 221', () => {
    const coverage = getElectionEmailCoverage(COUNTRIES);
    expect(coverage.approved).toBe(166);
    expect(coverage.total).toBe(221);
  });

  test('buildRecipientPayloads includes yellow warning for notice-no-email stations', () => {
    const payloads = buildRecipientPayloads({
      toEmail: 'general@embassy.example',
      electionContactApproval: 'unconfirmed',
      electionNotice: {
        url: 'https://example.com/notice',
        title: 'Izbori 2026',
        electionYear: '2026',
        observedAt: '2026-09-16T01:00:00Z',
        emailStatus: 'no-email-extracted',
      },
      isIdDocumentEmbedded: true,
      isWetInkSignature: false,
      subject: 'Prijava',
      body: 'Tekst',
      fullName: 'Petar Petrovic',
      script: 'latin',
    });

    expect(payloads.webShareInfo.text).toContain('nije navedena posebna i-mejl adresa');
    expect(payloads.webShareInfo.text).toContain('Preporučujemo da u poruci zatražite potvrdu prijema');
    expect(payloads.manualText).toContain('nije navedena posebna i-mejl adresa');
    expect(payloads.standardBody).toBe('Tekst\n\nS poštovanjem,\nPetar Petrovic');
  });

  test('buildMissionInquiryUrl adapts its question when an election notice exists', () => {
    const vukovar = COUNTRY_BY_CODE.get('HR')!.stations.find((s) => s.id.includes('vukovar'))!;
    expect(getStationElectionStatus(vukovar)).toBe('notice-no-email');

    const latinInquiry = buildMissionInquiryUrl(vukovar, 'Hrvatska', 'latin');
    expect(latinInquiry).not.toBeNull();
    const latinBody = new URL(latinInquiry!).searchParams.get('body')!;
    expect(latinBody).toContain('Upoznat/a sam sa zvaničnim obaveštenjem za izbore 2026.');
    expect(latinBody).toContain('da li potpisan zahtev i priloge mogu poslati na ovu adresu');
    expect(latinBody).not.toContain('Kada i gde će biti objavljeno uputstvo');

    const cyrillicInquiry = buildMissionInquiryUrl(vukovar, 'Хрватска', 'cyrillic');
    expect(cyrillicInquiry).not.toBeNull();
    const cyrillicBody = new URL(cyrillicInquiry!).searchParams.get('body')!;
    expect(cyrillicBody).toContain('Упознат/а сам са званичним обавештењем за изборе 2026.');
    expect(cyrillicBody).toContain('да ли потписан захтев и прилоге могу послати на ову адресу');
    expect(cyrillicBody).not.toContain('Када и где ће бити објављено упутство');

    // Cyrillic purity check: no Latin letters in body
    expect(/[A-Za-z]/u.test(cyrillicBody)).toBe(false);
  });
});
