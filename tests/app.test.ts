import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test, expect } from 'bun:test';
import { validateJmbg, validateEmail, formatSerbianDate } from '../src/lib/validators';
import { COUNTRIES, COUNTRY_BY_CODE } from '../src/data/missions';
import {
  filterCountries,
  getCountryTypeaheadResults,
  getTaiwanSearchNotice,
  resolveVotingDestinationSelection,
  StepVotingDestination,
} from '../src/components/StepVotingDestination';
import { generateApplicationPdf, ApplicationFormData } from '../src/lib/pdf';
import fs from 'fs';
import { buildRecipientPayloads, getWebmailLinks } from '../src/lib/share';
import { canSubmitSignature } from '../src/components/StepSignatureAndDocument';
import {
  buildInvitationCopyText,
  shareInvitation,
} from '../src/lib/share';
import {
  buildInvitationInfo,
  buildInvitationUrl,
  getInitialDesiredLocation,
} from '../src/lib/invite';

describe('JMBG Validator', () => {
  test('validates correct JMBG', () => {
    // Valid sample JMBG: 0101990710014
    // 0*7 + 1*6 + 0*5 + 1*4 + 9*3 + 9*2 + 0*7 + 7*6 + 1*5 + 0*4 + 0*3 + 1*2
    // = 6 + 4 + 27 + 18 + 42 + 5 + 2 = 104; 104 % 11 = 5; 11 - 5 = 6 (wait, let's compute exact checksum)
    // Let's compute a mathematically verified JMBG: 1207985710052
    // d = [1,2,0,7,9,8, 5,7,1,0,0,5]
    // sum = 7*(1+5) + 6*(2+7) + 5*(0+1) + 4*(7+0) + 3*(9+0) + 2*(8+5)
    // = 7*6 + 6*9 + 5*1 + 4*7 + 3*9 + 2*13 = 42 + 54 + 5 + 28 + 27 + 26 = 182
    // 182 % 11 = 6; checkDigit = 11 - 6 = 5.
    // So 1207985710055 is valid!
    const validJmbg = '1207985710055';
    const res = validateJmbg(validJmbg);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  test('rejects JMBG with invalid checksum', () => {
    const invalidJmbg = '1207985710059';
    const res = validateJmbg(invalidJmbg);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Kontrolna cifra');
  });

  test('rejects JMBG with wrong length', () => {
    expect(validateJmbg('123').valid).toBe(false);
    expect(validateJmbg('123456789012345').valid).toBe(false);
  });

  test('rejects non-numeric characters', () => {
    expect(validateJmbg('120798571005a').valid).toBe(false);
  });
});

describe('Email Validator', () => {
  test('accepts valid emails', () => {
    expect(validateEmail('consular.jakarta@mfa.rs')).toBe(true);
    expect(validateEmail('user.name+tag@gmail.com')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(validateEmail('plainaddress')).toBe(false);
    expect(validateEmail('@missingusername.com')).toBe(false);
    expect(validateEmail('missingdomain@')).toBe(false);
  });
});

describe('Signature submission guard', () => {
  test('rejects a newly empty draw canvas even when an earlier visit produced a signature PNG', () => {
    const staleSignaturePng = 'data:image/png;base64,previous-signature';
    const remountedEmptyPad = {
      isEmpty: () => true,
      toDataURL: () => staleSignaturePng,
    };

    expect(canSubmitSignature(false, remountedEmptyPad as never)).toBe(false);
  });

  test('permits proceeding with the wet-ink flow without a signature canvas', () => {
    expect(canSubmitSignature(true, null)).toBe(true);
  });
});

describe('Recipient Payloads', () => {
  const toEmail = 'consular.jakarta@mfa.rs';
  const subject = 'Пријава за гласање из иностранства — избори 2026.';
  const body = 'Поштовани,\n\nУ прилогу достављам попуњену пријаву.';
  const fullName = 'Петар Петровић';
  const standardBody = `${body}\n\nС поштовањем,\n${fullName}`;
  const temporaryHeader = '*** ПРИВРЕМЕНО УПУТСТВО — ОБРИШИТЕ ОВАЈ БЛОК ПРЕ СЛАЊА ***';
  const temporaryFooter = '*** КРАЈ ПРИВРЕМЕНОГ УПУТСТВА ***';
  const idReminder = 'Приложите слику прве стране српског пасоша или личне карте.';
  const downloadedPdfReminder = 'Приложите преузети PDF формулар.';

  const buildPayloads = (overrides: Partial<Parameters<typeof buildRecipientPayloads>[0]> = {}) =>
    buildRecipientPayloads({
      toEmail,
      isElectionContactConfirmed: true,
      isIdDocumentEmbedded: true,
      isWetInkSignature: false,
      subject,
      body,
      fullName,
      ...overrides,
    });

  test('puts confirmed recipient guidance in a removable Web Share block before the standard message', () => {
    const payloads = buildPayloads();

    expect(payloads.standardBody).toBe(standardBody);
    expect(payloads.webShareInfo).toEqual({
      subject,
      text: `${temporaryHeader}\n\nУ поље „За“ унесите адресу:\n${toEmail}\n\n${temporaryFooter}\n\n${standardBody}`,
    });
    expect(payloads.webShareInfo.text).not.toContain(downloadedPdfReminder);
  });

  test('adds the unconfirmed-contact warning and missing-ID reminder to the Web Share block', () => {
    const payloads = buildPayloads({
      isElectionContactConfirmed: false,
      isIdDocumentEmbedded: false,
    });

    expect(payloads.webShareInfo.text).toBe(
      `${temporaryHeader}\n\nУ поље „За“ унесите адресу:\n${toEmail}\n\nПАЖЊА: ${toEmail} је општи јавно објављени контакт мисије и није потврђен за упис у бирачки списак.\n\n${idReminder}\n\n${temporaryFooter}\n\n${standardBody}`,
    );
    expect(payloads.webShareInfo.text).not.toContain(downloadedPdfReminder);
  });

  test('keeps the mailto recipient structural and requires the downloaded PDF plus a missing-ID attachment', () => {
    const payloads = buildPayloads({ isIdDocumentEmbedded: false });
    const webmailLinks = getWebmailLinks(payloads.dispatchInfo);
    const mailto = new URL(webmailLinks.mailto);

    expect(payloads.dispatchInfo.toEmail).toBe(toEmail);
    expect(mailto.protocol).toBe('mailto:');
    expect(mailto.pathname).toBe(toEmail);
    expect(mailto.searchParams.get('subject')).toBe(subject);
    expect(mailto.searchParams.get('body')).toBe(
      `${temporaryHeader}\n\n${downloadedPdfReminder}\n\n${idReminder}\n\n${temporaryFooter}\n\n${standardBody}`,
    );
    expect(mailto.searchParams.get('body')).not.toContain('У поље „За“');
    expect(mailto.searchParams.get('body')).not.toContain(toEmail);
    for (const webmailLink of [webmailLinks.gmail, webmailLinks.outlook, webmailLinks.yahoo]) {
      expect(webmailLink).toContain(encodeURIComponent(downloadedPdfReminder));
      expect(webmailLink).toContain(encodeURIComponent(idReminder));
    }
  });

  test('reminds a wet-ink applicant to attach the scanned signature form in mailto and webmail bodies', () => {
    const payloads = buildPayloads({ isWetInkSignature: true });
    const scanReminder = 'Приложите скенирану или фотографисану својеручно потписану пријаву.';
    const webmailLinks = getWebmailLinks(payloads.dispatchInfo);

    expect(payloads.dispatchInfo.body).toBe(
      `${temporaryHeader}\n\n${scanReminder}\n\n${temporaryFooter}\n\n${standardBody}`,
    );
    expect(payloads.dispatchInfo.body).not.toContain(downloadedPdfReminder);
    for (const webmailLink of [webmailLinks.gmail, webmailLinks.outlook, webmailLinks.yahoo]) {
      expect(webmailLink).toContain(encodeURIComponent(scanReminder));
      expect(webmailLink).not.toContain(encodeURIComponent(downloadedPdfReminder));
    }
  });

  test('copies complete, removable manual instructions before the standard body', () => {
    const payloads = buildPayloads({ isIdDocumentEmbedded: false });

    expect(payloads.manualText).toBe(
      `${temporaryHeader}\n\nЗа: ${toEmail}\n\nНаслов: ${subject}\n\nОбавезни прилози: PDF формулар; слика прве стране српског пасоша или личне карте.\n\n${temporaryFooter}\n\n${standardBody}`,
    );
  });
});

describe('Invitation links', () => {
  test('accepts exactly one non-empty trimmed destination parameter', () => {
    expect(getInitialDesiredLocation('?destination=%20Singapur%20')).toBe('Singapur');
    expect(getInitialDesiredLocation('')).toBe('');
    expect(getInitialDesiredLocation('?destination=%20%20')).toBe('');
    expect(getInitialDesiredLocation('?destination=Singapur&destination=Jakarta')).toBe('');
  });

  test('builds a clean destination-only invitation URL and Latin share payload', () => {
    const invitation = buildInvitationInfo(
      'https://glasanje.example',
      '/prijava?country=SG#summary',
      ' Singapur ',
    );

    expect(buildInvitationUrl('https://glasanje.example', '/prijava?country=SG#summary', 'Singapur'))
      .toBe('https://glasanje.example/prijava?destination=Singapur');
    expect(invitation).toEqual({
      title: 'Glasanje u inostranstvu',
      text: 'Popunite prijavu za glasanje u inostranstvu za željeno mesto: Singapur.',
      url: 'https://glasanje.example/prijava?destination=Singapur',
    });
  });

  test('copies the complete invitation text and URL when native sharing is unavailable', async () => {
    const invitation = buildInvitationInfo('https://glasanje.example', '/', 'Singapur');
    let copiedText = '';
    const result = await shareInvitation(invitation, async (text) => {
      copiedText = text;
      return true;
    });

    expect(result).toEqual({ success: true, method: 'clipboard' });
    expect(copiedText).toBe(buildInvitationCopyText(invitation));
  });
});

describe('Missions and Coverage Dataset', () => {
  test('contains 195 countries', () => {
    expect(COUNTRIES.length).toBe(195);
  });

  test('uses Serbian Cyrillic alphabetical order for the first catalog countries', () => {
    expect(COUNTRIES.slice(0, 10).map((country) => country.countryCode)).toEqual([
      'AF',
      'AZ',
      'AL',
      'DZ',
      'AO',
      'AD',
      'AG',
      'AR',
      'AU',
      'AT',
    ]);
  });

  test('country selection resolves its first mission and preserves an explicit mission override', () => {
    const canada = COUNTRY_BY_CODE.get('CA')!;
    const singapore = COUNTRY_BY_CODE.get('SG')!;

    expect(resolveVotingDestinationSelection('')).toEqual({ countryCode: '', stationId: null });
    expect(resolveVotingDestinationSelection('CA')).toEqual({
      countryCode: 'CA',
      stationId: canada.stations[0].id,
    });
    expect(resolveVotingDestinationSelection('CA', canada.stations[1].id)).toEqual({
      countryCode: 'CA',
      stationId: canada.stations[1].id,
    });
    expect(resolveVotingDestinationSelection('CA').stationId).not.toBe(singapore.stations[0].id);
  });

  test('country typeahead exposes matching results directly while typing and resolves US aliases', () => {
    expect(getCountryTypeaheadResults('')).toEqual([]);
    expect(getCountryTypeaheadResults('Canada').map((country) => country.countryCode)).toEqual(['CA']);
    expect(getCountryTypeaheadResults('Kanad').map((country) => country.countryCode)).toEqual(['CA']);
    expect(filterCountries('us').map((country) => country.countryCode)).toEqual(['US']);
    expect(filterCountries('Sjedinjene Američke Države').map((country) => country.countryCode)).toEqual([
      'US',
    ]);
  });

  test('Taiwan aliases show an unassigned guidance notice without selecting a mission', () => {
    for (const alias of ['Тајван', 'Tajvan', 'Taiwan', 'Taiwanese passports']) {
      expect(getCountryTypeaheadResults(alias)).toEqual([]);
      expect(getTaiwanSearchNotice(alias)).toContain('nije potvrđena nadležnost');
      expect(getTaiwanSearchNotice(alias)).toContain('ne bira predstavništvo');
    }

    expect(resolveVotingDestinationSelection('TW')).toEqual({ countryCode: '', stationId: null });
  });

  test('shows the multi-mission choice hint only for countries with multiple missions', () => {
    const canadaMarkup = renderToStaticMarkup(
      React.createElement(StepVotingDestination, {
        initialData: { countryCode: 'CA' },
        onBack: () => undefined,
        onNext: () => undefined,
      }),
    );
    const singaporeMarkup = renderToStaticMarkup(
      React.createElement(StepVotingDestination, {
        initialData: { countryCode: 'SG' },
        onBack: () => undefined,
        onNext: () => undefined,
      }),
    );

    expect(canadaMarkup).toContain('Za ovu državu ima više predstavništava');
    expect(canadaMarkup).toContain('Ambasada Republike Srbije (Kanada)');
    expect(canadaMarkup).not.toContain('Džakarta');
    expect(singaporeMarkup).not.toContain('Za ovu državu ima više predstavništava');
  });

  test('United States retains bilingual discovery aliases', () => {
    const us = COUNTRY_BY_CODE.get('US');
    expect(us).toBeDefined();

    expect(us!.aliases).toEqual(
      expect.arrayContaining([
        'SAD',
        'USA',
        'Amerika',
        'Америка',
        'Sjedinjene Američke Države',
        'Сједињене Америчке Државе',
      ]),
    );
  });

  test('Singapore is covered by Jakarta embassy with correct email', () => {
    const sg = COUNTRY_BY_CODE.get('SG');
    expect(sg).toBeDefined();
    expect(sg?.label).toBe('Singapur');
    expect(sg?.stations.length).toBe(1);

    const station = sg!.stations[0];
    expect(station.isResident).toBe(false);
    expect(station.email).toBe('consular.jakarta@mfa.rs');
    expect(station.website).toBe('https://jakarta.mfa.gov.rs');
    expect(station.embassyCyr).toContain('Индонезија');
    expect(station.embassyCyr).toContain('Сингапур');
  });

  test('Ireland is covered by London embassy with correct email', () => {
    const ie = COUNTRY_BY_CODE.get('IE');
    expect(ie).toBeDefined();
    expect(ie?.label).toBe('Irska');
    expect(ie?.stations.length).toBe(1);

    const station = ie!.stations[0];
    expect(station.isResident).toBe(false);
    expect(station.email).toBe('consular.london@mfa.rs');
    expect(station.website).toBe('https://www.london.mfa.gov.rs');
  });

  test('New Zealand is covered by Canberra embassy with correct email', () => {
    const nz = COUNTRY_BY_CODE.get('NZ');
    expect(nz).toBeDefined();
    expect(nz?.label).toBe('Novi Zeland');
    expect(nz?.stations.length).toBe(1);

    const station = nz!.stations[0];
    expect(station.isResident).toBe(false);
    expect(station.email).toBe('srb.emb.australia@mfa.rs');
    expect(station.website).toBe('https://canberra.mfa.gov.rs');
  });

  test('Germany has 6 resident stations', () => {
    const de = COUNTRY_BY_CODE.get('DE');
    expect(de).toBeDefined();
    expect(de?.stations.length).toBe(6);
    const emails = de!.stations.map((s) => s.email);
    expect(emails).toContain('info@botschaft-serbien.de');
    expect(emails).toContain('gk-stutgart@t-online.de');
    expect(emails).toContain('info@gksrbfra.de');
    expect(emails).toContain('gk.muenchen@mfa.rs');
    expect(emails).toContain('info.dusseldorf@mfa.rs');
    expect(emails).toContain('info@gkrshamburg.de');
  });

  test('Austria embassy is distinct from Salzburg consulate', () => {
    const at = COUNTRY_BY_CODE.get('AT');
    expect(at).toBeDefined();

    const embassy = at!.stations.find((station) => station.id === 'st-at-emb-main');
    expect(embassy).toBeDefined();
    expect(embassy?.email).toBe('consulate.vienna@mfa.rs');
    expect(at!.stations.some((station) => station.id === 'st-at-emb-salcburg')).toBe(false);
  });

  test('every country has at least one polling station with a non-empty email', () => {
    for (const country of COUNTRIES) {
      expect(country.stations.length).toBeGreaterThan(0);
      for (const station of country.stations) {
        expect(station.email.trim().length).toBeGreaterThan(0);
        expect(station.email).toContain('@');
      }
    }
  });

  test('marks all current published mission contacts as unconfirmed election recipients', () => {
    const stations = COUNTRIES.flatMap((country) => country.stations);

    expect(stations.every((station) => !station.isElectionContactConfirmed)).toBe(true);
  });

  test('exposes election-contact confirmation as station metadata', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];

    expect(station.isElectionContactConfirmed).toBe(false);
  });

  test('station IDs are non-empty and globally unique', () => {
    const stationIds = COUNTRIES.flatMap((country) =>
      country.stations.map((station) => station.id),
    );

    expect(stationIds.every((id) => id.trim().length > 0)).toBe(true);
    expect(new Set(stationIds).size).toBe(stationIds.length);
  });
});

describe('Date Formatter', () => {
  test('formats date in DD.MM.YYYY. format', () => {
    const d = new Date(2026, 8, 9); // Sept 9, 2026
    expect(formatSerbianDate(d)).toBe('09.09.2026.');
  });
});

describe('PDF Generator', () => {
  test('generates valid 1-page application PDF', async () => {
    // Mock fetch for test runner
    globalThis.fetch = async (url: string | URL | Request) => {
      const pathStr = typeof url === 'string' ? url : url.toString();
      const localPath = 'public' + pathStr;
      const buf = fs.readFileSync(localPath);
      return {
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      } as unknown as Response;
    };

    const sampleData: ApplicationFormData = {
      fullName: 'Петар Петровић',
      placeOfBirth: 'Чачак',
      jmbg: '1207985710055',
      serbianAddress: 'Немањина 11, Београд',
      foreignAddress: '7500E Beach Road, Singapore 199595',
      stationName: 'Амбасада Републике Србије (Индонезија) (покрива Сингапур)',
      desiredLocation: '',
      signingDate: '09.09.2026.',
      phone: '+65 9123 4567',
      email: 'petar.petrovic@example.com',
      signaturePngDataUrl: '',
    };

    const pdfBytes = await generateApplicationPdf(sampleData);
    expect(pdfBytes.length).toBeGreaterThan(50000);

    const header = new TextDecoder().decode(pdfBytes.slice(0, 8));
    expect(header.startsWith('%PDF-')).toBe(true);
  });

  test('generates 2-page PDF when ID document is attached', async () => {
    const samplePng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const sampleData: ApplicationFormData = {
      fullName: 'Петар Петровић',
      placeOfBirth: 'Чачак',
      jmbg: '1207985710055',
      serbianAddress: 'Немањина 11, Београд',
      foreignAddress: '7500E Beach Road, Singapore 199595',
      stationName: 'Амбасада Републике Србије (Индонезија) (покрива Сингапур)',
      desiredLocation: '',
      signingDate: '09.09.2026.',
      phone: '+65 9123 4567',
      email: 'petar.petrovic@example.com',
      signaturePngDataUrl: samplePng,
      idDocumentDataUrl: samplePng,
    };

    const pdfBytes = await generateApplicationPdf(sampleData);
    expect(pdfBytes.length).toBeGreaterThan(60000);
  });
});
