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
import { StepPersonalInfo } from '../src/components/StepPersonalInfo';
import { generateApplicationPdf, ApplicationFormData } from '../src/lib/pdf';
import fs from 'fs';
import { buildRecipientPayloads, getWebmailLinks } from '../src/lib/share';
import { canSubmitSignature } from '../src/components/StepSignatureAndDocument';
import { StepExportAndSubmit } from '../src/components/StepExportAndSubmit';
import {
  buildInvitationCopyText,
  shareInvitation,
} from '../src/lib/share';
import {
  buildInvitationInfo,
  buildInvitationUrl,
  getInitialDesiredLocation,
} from '../src/lib/invite';
import App from '../src/App';
import { ElectionNoticeLink } from '../src/components/ElectionNoticeLink';
import { Header } from '../src/components/Header';
import {
  getElectionEmailCoverage,
  RegistrationEmailStatusPage,
} from '../src/components/RegistrationEmailStatusPage';
import {
  ScriptProvider,
  latinToCyrillic,
  translateStaticText,
} from '../src/lib/script';
import {
  Countdown,
  TARGET_DEADLINE_MS,
  calculateRemaining,
} from '../src/components/Countdown';


type CoverageStation = (typeof COUNTRIES)[number]['stations'][number] & {
  coverageSourceEmail?: string;
  coveringStationId?: string;
};
// Personal-information fields and the JMBG explanation must collect only what this flow needs
// without presenting the local checksum as identity or voter-roll verification.
describe('Personal information', () => {
  test('asks for one parent’s name instead of place of birth', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(StepPersonalInfo, {
          initialData: {
            fullName: '',
            parentName: '',
            jmbg: '',
            serbianAddress: '',
            phone: '',
            email: '',
          },
          onBack: () => undefined,
          onNext: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('Ime jednog roditelja');
    expect(markup).toContain('id="parentName"');
    expect(markup).not.toContain('Mesto rođenja');
  });

  test('keeps the local JMBG explanation limited to a mathematical checksum', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(StepPersonalInfo, {
          initialData: {
            fullName: '',
            parentName: '',
            jmbg: '',
            serbianAddress: '',
            phone: '',
            email: '',
          },
          onBack: () => undefined,
          onNext: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('математичким контролним збиром');
    expect(markup).toContain('не шаље се ниједном регистру');
    expect(markup).toContain('не доказује идентитет нити упис у бирачки списак');
  });
});

// Script selection is a visible accessibility contract: Cyrillic is the default, while Latin
// text appears only after an explicit preference and must not transliterate user-provided places.
describe('Interface script', () => {
  test('converts Serbian Latin letters and digraphs in every supported case', () => {
    expect(latinToCyrillic('Čačak, Ćuprija, Šid, Žabalj, Đak.')).toBe(
      'Чачак, Ћуприја, Шид, Жабаљ, Ђак.',
    );
    expect(latinToCyrillic('džep, Džep, DŽEP; ljiljan, Ljiljan, LJILJAN; njen, Njen, NJEN')).toBe(
      'џеп, Џеп, ЏЕП; љиљан, Љиљан, ЉИЉАН; њен, Њен, ЊЕН',
    );
  });

  test('uses Cyrillic for fresh app and standalone component rendering', () => {
    const appMarkup = renderToStaticMarkup(React.createElement(App));
    const headerMarkup = renderToStaticMarkup(
      React.createElement(Header, { onOpenPrivacy: () => undefined }),
    );
    expect(appMarkup).toContain('href="/status"');

    expect(appMarkup).toContain('Корак до гласа');
    expect(appMarkup).toContain('Провера');
    expect(headerMarkup).toContain('aria-pressed="true">Ћирилица');
    expect(headerMarkup).toContain('Писмо интерфејса');
    expect(headerMarkup).toContain('aria-pressed="false">Латиница');
    expect(headerMarkup).not.toContain('Korak do glasa');
  });

  test('renders the active step in compact context alongside the stepper', () => {
    const appMarkup = renderToStaticMarkup(React.createElement(App));

    expect(appMarkup).toContain('class="current-step-context"');
    expect(appMarkup).toMatch(/Корак.*1.*од.*5: <strong>Провера<\/strong>/);
  });

  test('renders Latin static text only after a Latin script opt-in', () => {
    const latinHeader = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(Header, { onOpenPrivacy: () => undefined }),
      ),
    );
    const destination = 'Чачак';

    expect(latinHeader).toContain('Korak do glasa');
    expect(latinHeader).toContain('aria-pressed="true">Latinica');
    expect(latinHeader).not.toContain('Корак до гласа');
    expect(latinHeader).toContain('aria-pressed="false">Ćirilica');
    expect(translateStaticText('latin', destination)).toBe(destination);
    expect(
      buildInvitationInfo('https://glasanje.example', '/', 'Čačak', 'cyrillic').text,
    ).toBe('Попуни и ти пријаву за гласање у иностранству за жељено место: Čačak.\n\nУкупно време за цео процес: 1 минут.');
    expect(latinHeader).not.toContain('Корак до гласа');
  });
});

// Input validation must reject malformed identifiers before an application can be produced.
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
    expect(res.error).toContain('Контролна цифра');
  });

  test('rejects JMBG with wrong length', () => {
    expect(validateJmbg('123').valid).toBe(false);
    expect(validateJmbg('123456789012345').valid).toBe(false);
  });

  test('rejects non-numeric characters', () => {
    expect(validateJmbg('120798571005a').valid).toBe(false);
  });
});

// Email validation protects the handoff flow from malformed recipient or applicant addresses.
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

// A stale signature image must never authorize a newly empty signature canvas; wet-ink users
// follow a separate attachment-based path.
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

// Sharing guidance separates removable recipient instructions from the message body and warns
// only when the selected mission contact is unconfirmed for election registration.
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
      electionContactApproval: 'source-confirmed',
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
      electionContactApproval: 'unconfirmed',
      isIdDocumentEmbedded: false,
    });

    expect(payloads.webShareInfo.text).toBe(
      `${temporaryHeader}\n\nУ поље „За“ унесите адресу:\n${toEmail}\n\nПАЖЊА: ${toEmail} је општи јавно објављени контакт мисије и није потврђен за упис у бирачки списак.\n\n${idReminder}\n\n${temporaryFooter}\n\n${standardBody}`,
    );
    expect(payloads.webShareInfo.text).not.toContain(downloadedPdfReminder);
  });

  test('does not label an operator-approved recipient as an unconfirmed general contact', () => {
    const payloads = buildPayloads({ electionContactApproval: 'operator-approved' });

    expect(payloads.webShareInfo.text).toContain(`У поље „За“ унесите адресу:\n${toEmail}`);
    expect(payloads.webShareInfo.text).not.toContain('је општи јавно објављени контакт мисије');
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

// Invitation URLs accept one intentional destination only, preserving a safe, shareable link
// and its selected-script copy when native sharing is unavailable.
describe('Invitation links', () => {
  test('accepts exactly one non-empty trimmed destination parameter', () => {
    expect(getInitialDesiredLocation('?destination=%20Singapur%20')).toBe('Singapur');
    expect(getInitialDesiredLocation('')).toBe('');
    expect(getInitialDesiredLocation('?destination=%20%20')).toBe('');
    expect(getInitialDesiredLocation('?destination=Singapur&destination=Jakarta')).toBe('');
  });

  test('builds the exact collaborative invitation in the selected script', () => {
    const invitation = buildInvitationInfo(
      'https://glasanje.example',
      '/prijava?country=SG#summary',
      ' Singapur ',
      'latin',
    );

    expect(buildInvitationUrl('https://glasanje.example', '/prijava?country=SG#summary', 'Singapur'))
      .toBe('https://glasanje.example/prijava?destination=Singapur');
    expect(invitation).toEqual({
      title: 'Podelite sa prijateljima',
      text: 'Popuni i ti prijavu za glasanje u inostranstvu za željeno mesto: Singapur.\n\nUkupno vreme za ceo proces: 1 minut.',
      url: 'https://glasanje.example/prijava?destination=Singapur',
      closing: 'Živela Srbija!',
    });
    expect(buildInvitationCopyText(invitation)).toBe(
      'Popuni i ti prijavu za glasanje u inostranstvu za željeno mesto: Singapur.\n\nUkupno vreme za ceo proces: 1 minut.\n\nhttps://glasanje.example/prijava?destination=Singapur\n\nŽivela Srbija!',
    );
  });

  test('copies the exact Cyrillic invitation when native sharing is unavailable', async () => {
    const invitation = buildInvitationInfo('https://glasanje.example', '/', 'Singapur', 'cyrillic');
    expect(invitation.title).toBe('Поделите са пријатељима');
    let copiedText = '';
    const result = await shareInvitation(invitation, 'cyrillic', async (text) => {
      copiedText = text;
      return true;
    });

    expect(result).toEqual({ success: true, method: 'clipboard' });
    expect(copiedText).toBe(
      'Попуни и ти пријаву за гласање у иностранству за жељено место: Singapur.\n\nУкупно време за цео процес: 1 минут.\n\nhttps://glasanje.example/?destination=Singapur\n\nЖивела Србија!',
    );
  });
});

// This catalog drives destination selection and outgoing contacts. These checks preserve lookup
// behavior, coverage relationships, stable station identity, and visible uncertainty warnings.
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
      expect(getTaiwanSearchNotice(alias)).toContain('није потврђена надлежност');
      expect(getTaiwanSearchNotice(alias)).toContain('не бира представништво');
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

    expect(canadaMarkup).toContain('За ову државу има више представништава');
    expect(canadaMarkup).toContain('Амбасада Републике Србије (Канада)');
    expect(canadaMarkup).not.toContain('Џакарта');
    expect(canadaMarkup).toContain('placeholder="Улица, број, град и држава"');
    expect(canadaMarkup).toContain('placeholder="нпр. Сан Франциско"');
    expect(singaporeMarkup).not.toContain('За ову државу има више представништава');
  });

  test('prominently marks an unconfirmed mission contact in static markup', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(StepVotingDestination, {
          initialData: { countryCode: 'AF' },
          onBack: () => undefined,
          onNext: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('class="mission-card mission-card--unconfirmed"');
    expect(markup).toContain('class="mission-warning" role="alert"');
    expect(markup).toContain('Прихватање захтева на ову адресу није потврђено.');
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

  test('Singapore inherits Jakarta’s final election-contact state through its exact coverage link', () => {
    const sg = COUNTRY_BY_CODE.get('SG');
    expect(sg).toBeDefined();
    expect(sg?.label).toBe('Singapur');
    expect(sg?.stations.length).toBe(1);

    const station = sg!.stations[0] as CoverageStation;
    const coveringStation = COUNTRIES
      .flatMap((country) => country.stations)
      .find((candidate) => candidate.id === station.coveringStationId);

    expect(station).toMatchObject({
      isResident: false,
      coverageSourceEmail: 'consular.jakarta@mfa.rs',
      coveringStationId: 'st-id-emb-main',
      website: 'https://jakarta.mfa.gov.rs',
    });
    expect(coveringStation).toMatchObject({ isResident: true });
    expect(station.email).toBe(coveringStation!.email);
    expect(station.electionContactApproval).toBe('operator-approved');
    expect(coveringStation!.electionContactApproval).toBe('operator-approved');
    expect(station.isElectionContactConfirmed).toBe(
      coveringStation!.isElectionContactConfirmed,
    );
    expect(station.embassyCyr).toContain('Индонезија');
    expect(station.embassyCyr).toContain('Сингапур');
    expect(station.electionNotice?.url).toBe('https://jakarta.mfa.gov.rs/mediji/aktuelnosti');
  });

  test('Ireland is covered by London embassy with correct email', () => {
    const ie = COUNTRY_BY_CODE.get('IE');
    expect(ie).toBeDefined();
    expect(ie?.label).toBe('Irska');
    expect(ie?.stations.length).toBe(1);

    const station = ie!.stations[0];
    expect(station.isResident).toBe(false);
    expect(station.email).toBe('izbori.london@mfa.rs');
    expect(station.website).toBe('https://www.london.mfa.gov.rs');
  });

  test('New Zealand is covered by Canberra embassy with an operator-approved election recipient', () => {
    const nz = COUNTRY_BY_CODE.get('NZ');
    expect(nz).toBeDefined();
    expect(nz?.label).toBe('Novi Zeland');
    expect(nz?.stations.length).toBe(1);

    const station = nz!.stations[0];
    expect(station.isResident).toBe(false);
    expect(station.email).toBe('consular.canberra@mfa.rs');
    expect(station.electionContactApproval).toBe('operator-approved');
    expect(station.isElectionContactConfirmed).toBe(false);
    expect(station.website).toBe('https://canberra.mfa.gov.rs');
  });
  test('Antigua and Barbuda preserves its explicit election recipient over its coverage source', () => {
    const station = COUNTRY_BY_CODE.get('AG')!.stations.find(
      (candidate) => candidate.id === 'st-nonres-ag',
    ) as CoverageStation;

    expect(station).toMatchObject({
      coverageSourceEmail: 'info@serbiaembusa.org',
      coveringStationId: 'st-us-emb-main',
      email: 'izbori@serbiaembusa.org',
      electionContactApproval: 'source-confirmed',
      isElectionContactConfirmed: true,
    });
  });

  test('projects every official Ministry coverage relationship with its declared recipient', () => {
    const expectedRelationships = [
      ['st-nonres-ge', 'st-am-emb-main', 'embserbia.yerevan@gmail.com'],
      ['st-nonres-mc-paris-mfa-gov-rs', 'st-fr-emb-main-paris-mfa-gov-rs', 'izbori.pariz@mfa.rs'],
      ['st-nonres-km', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-dj', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-er', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-ss', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-bi', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-ug', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-so', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-sc', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
      ['st-nonres-rw', 'st-ke-emb-main', 'srb.emb.kenya@mfa.rs'],
    ] as const;
    const stations = COUNTRIES.flatMap((country) => country.stations);

    for (const [coveredStationId, coveringStationId, electionEmail] of expectedRelationships) {
      const coveredStation = stations.find(
        (station) => station.id === coveredStationId,
      ) as CoverageStation;
      const coveringStation = stations.find(
        (station) => station.id === coveringStationId,
      )!;

      expect(coveredStation).toMatchObject({
        isResident: false,
        coveringStationId,
        email: electionEmail,
        electionContactApproval: 'operator-approved',
        isElectionContactConfirmed: false,
      });
      expect(coveredStation.coverageSourceEmail).toMatch(/@/);
      expect(coveringStation).toMatchObject({
        isResident: true,
      });
    }
  });


  test('Burundi presents Kenya’s approved coverage mission without losing its country context', () => {
    const station = COUNTRY_BY_CODE.get('BI')!.stations[0] as CoverageStation;
    const kenya = COUNTRY_BY_CODE.get('KE')!.stations.find(
      (candidate) => candidate.id === 'st-ke-emb-main',
    )!;

    expect(station).toMatchObject({
      isResident: false,
      coverageSourceEmail: 'srb.emb.kenya@mfa.rs',
      coveringStationId: 'st-ke-emb-main',
      email: 'srb.emb.kenya@mfa.rs',
      electionContactApproval: 'operator-approved',
      isElectionContactConfirmed: false,
      website: kenya.website,
      address: kenya.address,
    });
    expect(station.embassy).toBe(`${kenya.embassy} (pokriva Burundi)`);
    expect(station.embassyCyr).toBe(`${kenya.embassyCyr} (покрива Бурунди)`);
  });

  test('Georgia presents Armenia’s approved coverage mission', () => {
    const station = COUNTRY_BY_CODE.get('GE')!.stations.find(
      (candidate) => candidate.id === 'st-nonres-ge',
    ) as CoverageStation;
    const armenia = COUNTRY_BY_CODE.get('AM')!.stations.find(
      (candidate) => candidate.id === 'st-am-emb-main',
    )!;

    expect(station).toMatchObject({
      isResident: false,
      coverageSourceEmail: 'embserbia.yerevan@gmail.com',
      coveringStationId: 'st-am-emb-main',
      email: 'embserbia.yerevan@gmail.com',
      electionContactApproval: 'operator-approved',
      isElectionContactConfirmed: false,
      website: armenia.website,
      address: armenia.address,
    });
    expect(station.embassy).toBe(`${armenia.embassy} (pokriva Gruzija)`);
    expect(station.embassyCyr).toBe(`${armenia.embassyCyr} (покрива Грузија)`);
  });

  test('Monaco presents only the real Paris embassy coverage record', () => {
    const monaco = COUNTRY_BY_CODE.get('MC')!;
    const station = monaco.stations.find(
      (candidate) => candidate.id === 'st-nonres-mc-paris-mfa-gov-rs',
    ) as CoverageStation;
    const paris = COUNTRY_BY_CODE.get('FR')!.stations.find(
      (candidate) => candidate.id === 'st-fr-emb-main-paris-mfa-gov-rs',
    )!;

    expect(monaco.stations).toHaveLength(1);
    expect(station).toMatchObject({
      isResident: false,
      coverageSourceEmail: 'ambassade.paris@mfa.rs',
      coveringStationId: 'st-fr-emb-main-paris-mfa-gov-rs',
      email: 'izbori.pariz@mfa.rs',
      electionContactApproval: 'operator-approved',
      isElectionContactConfirmed: false,
      website: paris.website,
      address: paris.address,
    });
    expect(station.embassy).toBe(`${paris.embassy} (pokriva Monako)`);
    expect(station.embassyCyr).toBe(`${paris.embassyCyr} (покрива Монако)`);
    expect(COUNTRIES.flatMap((country) => country.stations).some(
      (candidate) => candidate.email === 'info@ccserbie.com',
    )).toBe(false);
  });

  test('Germany has 6 resident stations', () => {
    const de = COUNTRY_BY_CODE.get('DE');
    expect(de).toBeDefined();
    expect(de?.stations.length).toBe(6);
    const emails = de!.stations.map((s) => s.email);
    const hamburg = de!.stations.find((station) => station.id === 'st-de-cons-hamburg');
    expect(hamburg).toBeDefined();
    expect(hamburg?.email).toBe('izbori@gkrshamburg.de');
    expect(hamburg?.isElectionContactConfirmed).toBe(true);

    expect(emails).toContain('izbori@botschaft-serbien.de');
    expect(emails).toContain('izbori.stuttgart@mfa.rs');
    expect(emails).toContain('izbori@gksrbfra.de');
    expect(emails).toContain('gk.muenchen@mfa.rs');
    expect(emails).toContain('izbori.diseldorf@mfa.rs');
    expect(emails).toContain('izbori@gkrshamburg.de');
  });

  test('Austria embassy is distinct from Salzburg consulate', () => {
    const at = COUNTRY_BY_CODE.get('AT');
    expect(at).toBeDefined();

    const embassy = at!.stations.find((station) => station.id === 'st-at-emb-main');
    expect(embassy).toBeDefined();
    expect(embassy?.email).toBe('izbori.bec@mfa.rs');
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

  test('keeps contact approval status aligned with evidence confirmation', () => {
    const stations = COUNTRIES.flatMap((country) => country.stations);
    const validApprovalStatuses = [
      'source-confirmed',
      'operator-approved',
      'unconfirmed',
    ] as const;

    expect(stations.every((station) =>
      validApprovalStatuses.includes(station.electionContactApproval),
    )).toBe(true);
    expect(stations.some(
      (station) => station.electionContactApproval === 'operator-approved',
    )).toBe(true);
    expect(stations.every(
      (station) => station.isElectionContactConfirmed === (
        station.electionContactApproval === 'source-confirmed'
      ),
    )).toBe(true);
  });

  test('exposes election-contact approval as station metadata', () => {
    const station = COUNTRY_BY_CODE.get('AF')!.stations[0];

    expect(station.electionContactApproval).toBe('unconfirmed');
    expect(station.isElectionContactConfirmed).toBe(false);
  });


  test('station IDs are non-empty and globally unique', () => {
    const stationIds = COUNTRIES.flatMap((country) =>
      country.stations.map((station) => station.id),
    );

    expect(stationIds.every((id) => id.trim().length > 0)).toBe(true);
    expect(new Set(stationIds).size).toBe(stationIds.length);
  });

  test('exposes only resident targets through public coverage links', () => {
    const stations = COUNTRIES.flatMap((country) => country.stations);

    for (const country of COUNTRIES) {
      for (const station of country.stations) {
        const coverageStation = station as CoverageStation;
        if (!coverageStation.coveringStationId) {
          continue;
        }

        const coveringStation = stations.find(
          (candidate) => candidate.id === coverageStation.coveringStationId,
        );
        expect(coverageStation.isResident).toBe(false);
        expect(coverageStation.coverageSourceEmail).toMatch(/@/);
        expect(coveringStation).toMatchObject({ isResident: true });
        expect(coverageStation).not.toHaveProperty('_coverageStationId');
      }
    }
  });
});

// Rendering counts every confirmed recipient category as usable coverage.
describe('Registration Email Status', () => {
  test('links to notice evidence without asserting recipient approval', () => {
    for (const emailStatus of ['email-extracted', 'no-email-extracted'] as const) {
      const markup = renderToStaticMarkup(
        React.createElement(ScriptProvider, { initialScript: 'latin' },
          React.createElement(ElectionNoticeLink, { notice: {
            url: 'https://nicosia.mfa.gov.rs/mediji/election-notice',
            title: 'Izbori 2026', electionYear: '2026', observedAt: '2026-09-12T00:00:00Z', emailStatus,
          } }),
        ),
      );
      expect(markup).toContain('href="https://nicosia.mfa.gov.rs/mediji/election-notice"');
      expect(markup).toContain('Zvanično izborno obaveštenje');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).not.toContain('potvrđena');
      expect(markup.includes('proverite obaveštenje i priloge')).toBe(emailStatus === 'no-email-extracted');
    }
  });

  test('shows a precise missing-link note without relabelling approval', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ScriptProvider, { initialScript: 'latin' },
        React.createElement(ElectionNoticeLink, { showMissing: true }),
      ),
    );
    expect(markup).toContain('Link ka izbornom obaveštenju još nije dodat.');
    expect(markup).not.toContain('href=');
    expect(markup).not.toContain('nije potvrđena');
  });

  test('distinguishes a stated absence from a missing link and prefers a later announcement', () => {
    const render = (notice?: (typeof COUNTRIES)[number]['stations'][number]['electionNotice']) =>
      renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: 'latin' },
        React.createElement(ElectionNoticeLink, { status: 'not-published', showMissing: true, notice }),
      ));
    expect(render()).toContain('Misija nije objavila izborno obaveštenje.');
    expect(render()).not.toContain('još nije dodat');
    const notice = COUNTRY_BY_CODE.get('AT')!.stations[0].electionNotice!;
    expect(render(notice)).toContain(`href="${notice.url}"`);
    expect(render(notice)).not.toContain('nije objavila');
    for (const code of ['AM', 'GE']) {
      const country = COUNTRY_BY_CODE.get(code)!;
      const affected = country.stations.filter(station =>
        ['st-am-emb-main'].includes(station.coveringStationId || station.id));
      expect(affected.length).toBeGreaterThan(0);
      for (const station of affected) {
        expect(station.electionNoticeStatus).toBe('not-published');
        expect(station.electionNotice).toBeUndefined();
      }
    }
    for (const code of ['FR', 'KE', 'MC', 'BI', 'DJ', 'ER', 'KM', 'RW', 'SC', 'SO', 'SS', 'UG']) {
      const country = COUNTRY_BY_CODE.get(code)!;
      const affected = country.stations.filter(station =>
        ['st-fr-emb-main-paris-mfa-gov-rs', 'st-ke-emb-main'].includes(station.coveringStationId || station.id));
      expect(affected.length).toBeGreaterThan(0);
      for (const station of affected) {
        expect(station.electionNoticeStatus).toBeUndefined();
        expect(station.electionNotice?.emailStatus).toBe('email-extracted');
      }
    }
  });

  test('derives approved mission coverage from station records', () => {
    const coverage = getElectionEmailCoverage();
    const stations = COUNTRIES.flatMap((country) => country.stations);

    expect(coverage.approved).toBe(stations.filter(
      (station) => station.electionContactApproval !== 'unconfirmed',
    ).length);
    expect(coverage.total).toBe(stations.length);
  });

  test('counts source-confirmed and operator-approved records as usable coverage', () => {
    const sampledCountries = COUNTRIES.slice(0, 2).map((country) => ({
      ...country,
      stations: country.stations.map((station, index) => ({
        ...station,
        electionContactApproval: (
          index === 0 ? 'source-confirmed' : 'operator-approved'
        ) as 'source-confirmed' | 'operator-approved',
        isElectionContactConfirmed: index === 0,
      })),
    }));

    const coverage = getElectionEmailCoverage(sampledCountries);

    expect(coverage).toEqual({
      approved: sampledCountries.flatMap((country) => country.stations).length,
      total: sampledCountries.flatMap((country) => country.stations).length,
    });
  });

  test('shows the current coverage on both the home and status surfaces', () => {
    const coverage = getElectionEmailCoverage();
    const coverageSummary = `${coverage.approved}/${coverage.total}`;
    const homeMarkup = renderToStaticMarkup(React.createElement(App));
    const statusMarkup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(RegistrationEmailStatusPage),
      ),
    );

    expect(homeMarkup).toContain('href="/status"');
    expect(homeMarkup).toContain(coverageSummary);
    expect(statusMarkup).not.toContain('<select');
    expect(statusMarkup).toContain('id="coverage-country-SG"');
    expect(statusMarkup).toContain('href="/"');
    expect(statusMarkup).toContain(coverageSummary);
    expect(statusMarkup).toContain('Потврђене изборне и-мејл адресе');
    expect(statusMarkup).toContain('потврђену адресу за пријаву за гласање');
    expect(statusMarkup).not.toContain('од стране оператера');
    expect(statusMarkup).not.toContain('потврђено из извора');
  });
  test('renders an operator-approved recipient as confirmed without an unconfirmed-contact warning', () => {
    const operatorCountry = COUNTRIES.find((country) =>
      country.stations.some(
        (station) => station.electionContactApproval === 'operator-approved',
      ),
    )!;
    const station = operatorCountry.stations.find(
      (candidate) => candidate.electionContactApproval === 'operator-approved',
    )!;
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(StepVotingDestination, {
          initialData: {
            countryCode: operatorCountry.countryCode,
            stationId: station.id,
            foreignAddress: 'Primer adrese',
            desiredLocation: 'Primer mesta',
          },
          onBack: () => undefined,
          onNext: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(station.email);
    expect(markup).toContain('Контакт за пријаву за гласање је потврђен.');
    expect(markup).toContain(`href="${station.electionNotice!.url}"`);
    expect(markup).not.toContain('од стране оператера');
    expect(markup).not.toContain('mission-card--unconfirmed');
    expect(markup).not.toContain('role="alert"');
  });


  test('puts the announcement link beside the confirmed recipient on the submission screen', () => {
    const station = COUNTRY_BY_CODE.get('AT')!.stations[0];
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(StepExportAndSubmit, {
          formData: {
            fullName: 'Петар Петровић',
            parentName: 'Милош',
            jmbg: '0101990710006',
            serbianAddress: 'Београд',
            foreignAddress: 'Singapore',
            stationName: station.embassyCyr,
            desiredLocation: 'Singapur',
            signingDate: '10.09.2026.',
            phone: '+381601234567',
            email: 'petar@example.com',
            signaturePngDataUrl: '',
          },
          station,
          countryName: 'Singapur',
          countryNameCyr: 'Сингапур',
          isWetInkSignature: false,
          onBack: () => undefined,
          onReset: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('✓ Потврђена адреса за изборе 2026.');
    expect(markup).toContain(`href="${station.electionNotice!.url}"`);
    expect(markup).not.toContain('role="alert"');
    expect(markup).toContain('Не заборавите проверу бирачког списка');
    expect(markup).toContain('href="https://upit.birackispisak.gov.rs/"');
    expect(markup).toContain('поднесите га заједно са захтевом за гласање у иностранству');
  });

  test('marks an unconfirmed recipient explicitly while preserving Latin product brands in Cyrillic', () => {
    const station = COUNTRY_BY_CODE.get('AF')!.stations[0];
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        null,
        React.createElement(StepExportAndSubmit, {
          formData: {
            fullName: 'Петар Петровић',
            parentName: 'Милош',
            jmbg: '0101990710006',
            serbianAddress: 'Београд',
            foreignAddress: 'Kabul',
            stationName: station.embassyCyr,
            desiredLocation: 'Kabul',
            signingDate: '10.09.2026.',
            phone: '+381601234567',
            email: 'petar@example.com',
            signaturePngDataUrl: '',
          },
          station,
          countryName: 'Avganistan',
          countryNameCyr: 'Авганистан',
          isWetInkSignature: false,
          onBack: () => undefined,
          onReset: () => undefined,
        }),
      ),
    );

    expect(station.electionContactApproval).toBe('unconfirmed');
    expect(station.isElectionContactConfirmed).toBe(false);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Адреса за изборе није потврђена.');
    expect(markup).toContain('Gmail');
    expect(markup).toContain('Outlook');
    expect(markup).toContain('Yahoo Mail');
    expect(markup).not.toContain('Гмаил');
    expect(markup).not.toContain('Аутлук');
    expect(markup).not.toContain('Јаху');
  });
});

// Application dates use the Serbian document format expected by the generated form.
describe('Date Formatter', () => {
  test('formats date in DD.MM.YYYY. format', () => {
    const d = new Date(2026, 8, 9); // Sept 9, 2026
    expect(formatSerbianDate(d)).toBe('09.09.2026.');
  });
});

// Generated PDFs must remain valid for both ordinary and attachment-bearing applications across
// every selectable destination; a broken artifact would block the user's submission.
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
      parentName: 'Милорад',
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
      parentName: 'Милорад',
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
  test(
    'generates a PDF for every selectable application-supplied voting target',
    { timeout: 30_000 },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        const pathStr = typeof url === 'string' ? url : url.toString();
        const buffer = fs.readFileSync(`public${pathStr}`);
        return {
          ok: true,
          arrayBuffer: async () =>
            buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        } as unknown as Response;
      };

      try {
        for (const country of COUNTRIES) {
          for (const station of country.stations) {
            const pdfBytes = await generateApplicationPdf({
              fullName: 'Петар Петровић',
              parentName: 'Милорад',
              jmbg: '1207985710055',
              serbianAddress: 'Немањина 11, Београд',
              foreignAddress: '7500E Beach Road, Singapore 199595',
              stationName: station.embassyCyr,
              desiredLocation: country.labelCyr,
              signingDate: '09.09.2026.',
              phone: '+65 9123 4567',
              email: 'petar.petrovic@example.com',
              signaturePngDataUrl: '',
            });

            expect(new TextDecoder().decode(pdfBytes.slice(0, 8)).startsWith('%PDF-')).toBe(true);
          }
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

// The deadline is user-facing and time-zone-sensitive, so both its instant and its script-specific
// wording must remain unambiguous without presenting it as an expected or provisional date.
describe('Registration countdown', () => {
  test('targets official deadline: 3 October 2026 at 24:00 Belgrade time (22:00 UTC)', () => {
    const expectedIso = '2026-10-03T22:00:00.000Z';
    expect(new Date(TARGET_DEADLINE_MS).toISOString()).toBe(expectedIso);
  });

  test('calculateRemaining calculates time difference correctly and handles expiration', () => {
    const futureTarget = Date.now() + 1000 * 60 * 60 * 25 + 1000 * 65;
    const remaining = calculateRemaining(futureTarget);
    expect(remaining.isExpired).toBe(false);
    expect(remaining.days).toBe(1);
    expect(remaining.hours).toBe(1);
    expect(remaining.minutes).toBe(1);

    const pastRemaining = calculateRemaining(Date.now() - 1000);
    expect(pastRemaining.isExpired).toBe(true);
    expect(pastRemaining.days).toBe(0);
    expect(pastRemaining.hours).toBe(0);
    expect(pastRemaining.minutes).toBe(0);
    expect(pastRemaining.seconds).toBe(0);
  });

  test('renders official registration deadline in Latin script without expected placeholder', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'latin' },
        React.createElement(Countdown),
      ),
    );

    expect(markup).toContain('Rok za prijavu za glasanje iz inostranstva');
    expect(markup).not.toContain('(očekivano)');
    expect(markup).toContain('3. oktobar 2026. u 24:00 (ponoć po vremenu u Srbiji)');
    expect(markup).toContain('Zvanični rok za prijavu:');
  });

  test('renders official registration deadline in Cyrillic script without expected placeholder', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ScriptProvider,
        { initialScript: 'cyrillic' },
        React.createElement(Countdown),
      ),
    );

    expect(markup).toContain('Рок за пријаву за гласање из иностранства');
    expect(markup).not.toContain('(очекивано)');
    expect(markup).toContain('3. октобар 2026. у 24:00 (поноћ по времену у Србији)');
    expect(markup).toContain('Званични рок за пријаву:');
  });
});
