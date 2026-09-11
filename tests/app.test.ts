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
import { generateApplicationPdf, ApplicationFormData, PdfGenerationIssue } from '../src/lib/pdf';
import fs from 'fs';
import { buildRecipientPayloads, getWebmailLinks } from '../src/lib/share';
import { resolveCurrentElectionContact } from '../src/lib/electionContact';
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

  test('keeps confirmed handoff recipient and attachment guidance distinct by delivery route', () => {
    const payloads = buildPayloads({ isIdDocumentEmbedded: false });
    const webmailLinks = getWebmailLinks(payloads.dispatchInfo);
    const mailto = new URL(webmailLinks.mailto);

    expect(payloads.dispatchInfo.toEmail).toBe(toEmail);
    expect(mailto.pathname).toBe(toEmail);
    expect(payloads.webShareInfo.text).toContain(`У поље „За“ унесите адресу:\n${toEmail}`);
    expect(payloads.webShareInfo.text).toContain(idReminder);
    expect(payloads.webShareInfo.text).not.toContain(downloadedPdfReminder);
    expect(mailto.searchParams.get('body')).toContain(downloadedPdfReminder);
    expect(mailto.searchParams.get('body')).toContain(idReminder);
    expect(payloads.manualText).toContain('Обавезни прилози: PDF формулар; слика прве стране српског пасоша или личне карте.');
  });

  test('emits the exact unconfirmed-contact warning once in every temporary handoff block', () => {
    const payloads = buildPayloads({
      isElectionContactConfirmed: false,
      isIdDocumentEmbedded: false,
    });
    const warning =
      `ПАЖЊА: ${toEmail} је општи јавно објављени контакт мисије и није потврђен за упис у бирачки списак. Пре слања проверите адресу на званичном сајту мисије.`;

    for (const handoffText of [
      payloads.webShareInfo.text,
      payloads.dispatchInfo.body,
      payloads.manualText,
    ]) {
      expect(handoffText.split(warning).length - 1).toBe(1);
      expect(handoffText).toContain(temporaryHeader);
      expect(handoffText).toContain(temporaryFooter);
    }
    expect(payloads.standardBody).not.toContain(warning);
  });

  test('requires the wet-ink scan rather than an unsigned downloaded PDF in compose routes', () => {
    const payloads = buildPayloads({ isWetInkSignature: true });
    const webmailLinks = getWebmailLinks(payloads.dispatchInfo);
    const mailtoBody = new URL(webmailLinks.mailto).searchParams.get('body');
    const scanReminder = 'Приложите скенирану или фотографисану својеручно потписану пријаву.';

    expect(mailtoBody).toContain(scanReminder);
    expect(mailtoBody).not.toContain(downloadedPdfReminder);
    expect(webmailLinks.gmail).toContain(encodeURIComponent(scanReminder));
  });
});

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
          initialData: { countryCode: 'SG' },
          onBack: () => undefined,
          onNext: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('class="mission-card mission-card--unconfirmed"');
    expect(markup).toContain('class="mission-warning" role="alert"');
    expect(markup).toContain('Ово је општи контакт мисије. Није потврђен као адреса за пријаву за гласање; проверите актуелно изборно обавештење на званичном сајту испод.');
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

  test('preserves a routeable public mission contact for a non-resident station', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];

    expect(station.isResident).toBe(false);
    expect(station.missionEmail).toBe('consular.jakarta@mfa.rs');
    expect(station.website).toBe('https://jakarta.mfa.gov.rs');
    expect(station.embassyCyr).toContain('Индонезија');
    expect(station.embassyCyr).toContain('Сингапур');
  });

  test('fails closed to the public mission contact when an election authority expires', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
    const currentStation = {
      ...station,
      missionEmail: 'mission@example.rs',
      electionAuthority: {
        candidateId: 'candidate-1',
        electionId: 'election-2026',
        email: 'izbori@example.rs',
        sourceUrl: 'https://mission.example.rs/elections',
        expiresAt: '2026-09-12T00:00:00.000Z',
        evidenceSha256: 'a'.repeat(64),
      },
    };

    expect(resolveCurrentElectionContact(currentStation, new Date('2026-09-11T12:00:00.000Z')))
      .toMatchObject({ missionEmail: 'mission@example.rs', electionAuthority: { email: 'izbori@example.rs' } });
    expect(resolveCurrentElectionContact(currentStation, new Date('2026-09-13T00:00:00.000Z')))
      .toEqual({ missionEmail: 'mission@example.rs', electionAuthority: null });
  });

  test('keeps every station identity unique and every public mission contact usable', () => {
    const stations = COUNTRIES.flatMap((country) => country.stations);

    expect(stations.every((station) => station.id.trim().length > 0)).toBe(true);
    expect(new Set(stations.map((station) => station.id)).size).toBe(stations.length);
    expect(stations.every((station) => station.missionEmail.includes('@'))).toBe(true);
  });

});

describe('Registration Email Status', () => {
  test('counts only election authorities that are current at the time of evaluation', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
    const now = new Date('2026-09-11T12:00:00.000Z');
    const withAuthority = {
      ...station,
      missionEmail: 'mission@example.rs',
      electionAuthority: {
        candidateId: 'candidate-1',
        electionId: 'election-2026',
        email: 'izbori@example.rs',
        sourceUrl: 'https://mission.example.rs/elections',
        expiresAt: '2026-09-12T00:00:00.000Z',
        evidenceSha256: 'a'.repeat(64),
      },
    };
    const expiredAuthority = {
      ...withAuthority,
      electionAuthority: { ...withAuthority.electionAuthority, expiresAt: '2026-09-10T00:00:00.000Z' },
    };
    const countries = [{
      countryCode: 'XX',
      label: 'Primer',
      labelCyr: 'Пример',
      stations: [withAuthority, expiredAuthority],
    }];

    expect(getElectionEmailCoverage(countries, now)).toEqual({ confirmed: 1, total: 2 });
  });

  test('routes current election recipients while keeping unconfirmed mission contacts visible', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
    const currentStation = {
      ...station,
      missionEmail: 'mission@example.rs',
      electionAuthority: {
        candidateId: 'candidate-1',
        electionId: 'election-2026',
        email: 'izbori@example.rs',
        sourceUrl: 'https://mission.example.rs/elections',
        expiresAt: '2099-01-01T00:00:00.000Z',
        evidenceSha256: 'a'.repeat(64),
      },
    };
    const unconfirmedStation = { ...currentStation, electionAuthority: null };
    const renderHandoff = (handoffStation: typeof station) =>
      renderToStaticMarkup(
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
              stationName: handoffStation.embassyCyr,
              desiredLocation: 'Singapur',
              signingDate: '10.09.2026.',
              phone: '+381601234567',
              email: 'petar@example.com',
              signatureMode: 'screen',
              signaturePngDataUrl: '',
            },
            station: handoffStation,
            countryName: 'Singapur',
            countryNameCyr: 'Сингапур',
            isWetInkSignature: false,
            onBack: () => undefined,
            onReset: () => undefined,
          }),
        ),
      );
    const currentMarkup = renderHandoff(currentStation);
    const unconfirmedMarkup = renderHandoff(unconfirmedStation);

    expect(currentMarkup).toContain('izbori@example.rs');
    expect(currentMarkup).toContain('mission@example.rs');
    expect(currentMarkup).toContain('mailto:izbori@example.rs');
    expect(currentMarkup).toContain(encodeURIComponent('Приложите преузети PDF формулар.'));
    expect(unconfirmedMarkup).toContain('role="alert"');
    expect(unconfirmedMarkup).toContain('mailto:mission@example.rs');
    expect(unconfirmedMarkup).toContain(encodeURIComponent(
      'ПАЖЊА: mission@example.rs је општи јавно објављени контакт мисије и није потврђен за упис у бирачки списак. Пре слања проверите адресу на званичном сајту мисије.',
    ));
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
      parentName: 'Милорад',
      jmbg: '1207985710055',
      serbianAddress: 'Немањина 11, Београд',
      foreignAddress: '7500E Beach Road, Singapore 199595',
      stationName: 'Амбасада Републике Србије (Индонезија) (покрива Сингапур)',
      desiredLocation: '',
      signingDate: '09.09.2026.',
      phone: '+65 9123 4567',
      email: 'petar.petrovic@example.com',
      signatureMode: 'wet-ink',
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
      signatureMode: 'screen',
      signaturePngDataUrl: samplePng,
      idDocumentDataUrl: samplePng,
    };

    const pdfBytes = await generateApplicationPdf(sampleData);
    expect(pdfBytes.length).toBeGreaterThan(60000);
  });

  test('either generates bytes or raises a typed capacity issue for every selectable voting target', async () => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const pathStr = typeof url === 'string' ? url : url.toString();
      const localPath = 'public' + pathStr;
      const buf = fs.readFileSync(localPath);
      return {
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      } as unknown as Response;
    };

    const baseData: Omit<ApplicationFormData, 'stationName' | 'desiredLocation'> = {
      fullName: 'Петар Петровић',
      parentName: 'Милорад',
      jmbg: '1207985710055',
      serbianAddress: 'Немањина 11, Београд',
      foreignAddress: '7500E Beach Road, Singapore 199595',
      signingDate: '09.09.2026.',
      phone: '+65 9123 4567',
      email: 'petar.petrovic@example.com',
      signatureMode: 'wet-ink',
      signaturePngDataUrl: '',
    };

    for (const country of COUNTRIES) {
      for (const station of country.stations) {
        let generatedBytes: Uint8Array | undefined;

        try {
          generatedBytes = await generateApplicationPdf({
            ...baseData,
            stationName: station.embassyCyr,
            desiredLocation: country.labelCyr,
          });
          expect(generatedBytes).toBeInstanceOf(Uint8Array);
        } catch (error) {
          expect(generatedBytes).toBeUndefined();
          expect(error).toBeInstanceOf(PdfGenerationIssue);
          expect((error as PdfGenerationIssue).code).toBe('field-capacity-exceeded');
          expect((error as PdfGenerationIssue).field).toBe('votingTarget');
        }
      }
    }
  }, { timeout: 30_000 });
});
