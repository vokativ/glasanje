import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import App from '../src/App';
import { COUNTRIES, COUNTRY_BY_CODE } from '../src/data/missions';
import { MissionInquiryLink } from '../src/components/MissionInquiryLink';
import { buildMissionInquiryUrl } from '../src/lib/missionInquiry';
import { getInitialScript, ScriptProvider } from '../src/lib/script';

describe('Country links into the registration wizard', () => {
  test('accepts one explicit Latin preference and defaults ambiguous hints to Cyrillic', () => {
    expect(getInitialScript('?country=SG&script=latin')).toBe('latin');
    for (const search of ['', '?script=cyrillic', '?script=invalid', '?script=latin&script=cyrillic', '?script=latin&script=latin']) {
      expect(getInitialScript(search)).toBe('cyrillic');
    }
  });

  test('country entry retains Latin for personal details and the return link to coverage', () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { pathname: '/', search: '?country=SG&script=latin' } },
    });
    try {
      const markup = renderToStaticMarkup(React.createElement(App));
      expect(markup).toContain('Korak 2: Lični podaci');
      expect(markup).toContain('href="/status?script=latin"');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  test.each([
    ['?country=SG', true],
    ['?country=%20sg%20', true],
    ['?country=CA&destination=Toronto', true],
    ['', false],
    ['?destination=Toronto', false],
    ['?country=', false],
    ['?country=ZZ', false],
    ['?country=SG&country=CA', false],
    ['?country=SG&country=SG', false],
  ])('%s starts on the appropriate screen without checking the registry step', (search, skipsRegistry) => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { pathname: '/', search } },
    });
    try {
      const markup = renderToStaticMarkup(React.createElement(App));
      expect(markup.includes('id="fullName"')).toBe(skipsRegistry);
      expect(markup).toContain(`<div class="step-dot">${skipsRegistry ? 2 : 1}</div>`);
      expect(markup).toContain('<div class="step-dot">1</div>');
      expect(markup).not.toContain('<div class="step-dot">✓</div>');
      expect(markup.includes('href="https://upit.birackispisak.gov.rs/"')).toBe(!skipsRegistry);
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});

describe('Mission inquiry drafts', () => {
  test('every current unconfirmed entry has its own recipient and selected-country text in both scripts', () => {
    for (const country of COUNTRIES) {
      for (const station of country.stations) {
        for (const script of ['cyrillic', 'latin'] as const) {
          const label = script === 'latin' ? country.label : country.labelCyr;
          const href = buildMissionInquiryUrl(station, label, script);
          if (station.electionContactApproval !== 'unconfirmed') {
            expect(href).toBeNull();
            continue;
          }
          expect(href).not.toBeNull();
          const url = new URL(href!);
          expect(url.pathname).toBe(station.email.trim());
          expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
          expect(url.searchParams.get('subject')).toBe(`${script === 'latin' ? 'Upit o prijavi za glasanje 2026.' : 'Упит о пријави за гласање 2026.'} — ${label}`);
          const body = url.searchParams.get('body')!;
          expect(body).toContain(`${script === 'latin' ? 'Država u kojoj boravim:' : 'Држава у којој боравим:'} ${label}.`);
          expect(body.startsWith(script === 'latin' ? 'Poštovani,' : 'Поштовани,')).toBe(true);
          expect(script === 'latin' ? /[\u0400-\u04ff]/u.test(body) : /[A-Za-z]/u.test(body)).toBe(false);
        }
      }
    }
  });

  test('uses the resolved covering mission while retaining the selected country in the draft', () => {
    const afghanistan = COUNTRY_BY_CODE.get('AF')!;
    const station = afghanistan.stations[0];
    const tehran = COUNTRY_BY_CODE.get('IR')!.stations[0];
    expect(station.isResident).toBe(false);
    const url = new URL(buildMissionInquiryUrl(station, afghanistan.label, 'latin')!);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(tehran.email);
    expect(url.searchParams.get('subject')).toContain('Avganistan');
    const body = url.searchParams.get('body')!;
    expect(body).toContain('Država u kojoj boravim: Avganistan.');
    expect(body).toContain('Ako je uputstvo već objavljeno');
    expect(body).toContain('člana 16.');
    expect(body).toContain('3. oktobar 2026.');
    expect(body).not.toContain('JMBG');
  });

  test('keeps a consulate’s own recipient and safely encodes Cyrillic and punctuation', () => {
    const hercegNovi = COUNTRY_BY_CODE.get('ME')!.stations.find(station => station.id.includes('hercegnovi'))!;
    expect(hercegNovi).toBeDefined();
    const countryName = 'Црна Гора & пример + Čačak';
    const url = new URL(buildMissionInquiryUrl(hercegNovi, countryName, 'cyrillic')!);
    expect(url.pathname).toBe(hercegNovi.email);
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
    expect(url.searchParams.get('subject')).toBe(`Упит о пријави за гласање 2026. — ${countryName}`);
    expect(url.searchParams.get('body')).toContain(`Држава у којој боравим: ${countryName}.`);
  });

  test('does not offer an inquiry for either approved state or an unusable recipient', () => {
    const station = COUNTRY_BY_CODE.get('AF')!.stations[0];
    for (const electionContactApproval of ['operator-approved', 'source-confirmed'] as const) {
      const approved = { ...station, electionContactApproval };
      expect(buildMissionInquiryUrl(approved, 'Singapur', 'latin')).toBeNull();
      expect(renderToStaticMarkup(React.createElement(MissionInquiryLink, {
        station: approved, countryName: 'Singapur',
      }))).toBe('');
    }
    for (const email of ['', 'no address', 'a@example.com?bcc=other@example.com', 'a@example.com\r\nBcc:other@example.com']) {
      expect(buildMissionInquiryUrl({ ...station, email }, 'Singapur', 'latin')).toBeNull();
    }
  });

  test('labels the general-contact inquiry as a draft the user sends themselves', () => {
    const station = COUNTRY_BY_CODE.get('AF')!.stations[0];
    const markup = renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: 'latin' },
      React.createElement(MissionInquiryLink, { station, countryName: 'Avganistan' }),
    ));
    expect(markup).toContain(`href="mailto:${station.email}?subject=`);
    expect(markup).toContain('Pitajte misiju za uputstvo');
    expect(markup).toContain('Poruku pregledate i šaljete sami.');
  });
});
