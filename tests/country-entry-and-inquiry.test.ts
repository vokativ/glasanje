import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import App from '../src/App';
import { COUNTRY_BY_CODE } from '../src/data/missions';
import { MissionInquiryLink } from '../src/components/MissionInquiryLink';
import { buildMissionInquiryUrl } from '../src/lib/missionInquiry';
import { ScriptProvider } from '../src/lib/script';

describe('Country links into the registration wizard', () => {
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
  test('uses the resolved covering mission while retaining the selected country in the draft', () => {
    const singapore = COUNTRY_BY_CODE.get('SG')!;
    const station = singapore.stations[0];
    const jakarta = COUNTRY_BY_CODE.get('ID')!.stations[0];
    expect(station.isResident).toBe(false);
    const url = new URL(buildMissionInquiryUrl(station, singapore.label, 'latin')!);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(jakarta.email);
    expect(url.searchParams.get('subject')).toContain('Singapur');
    const body = url.searchParams.get('body')!;
    expect(body).toContain('Država u kojoj boravim: Singapur.');
    expect(body).toContain('Ako je uputstvo već objavljeno');
    expect(body).toContain('člana 16.');
    expect(body).toContain('3. oktobar 2026.');
    expect(body).not.toContain('JMBG');
  });

  test('keeps a consulate’s own recipient and safely encodes Cyrillic and punctuation', () => {
    const drvar = COUNTRY_BY_CODE.get('BA')!.stations.find(station => station.id.includes('drvar'))!;
    expect(drvar).toBeDefined();
    const countryName = 'Босна и Херцеговина & пример + Čačak';
    const url = new URL(buildMissionInquiryUrl(drvar, countryName, 'cyrillic')!);
    expect(url.pathname).toBe(drvar.email);
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
    expect(url.searchParams.get('subject')).toBe(`Упит о пријави за гласање 2026. — ${countryName}`);
    expect(url.searchParams.get('body')).toContain(`Држава у којој боравим: ${countryName}.`);
  });

  test('does not offer an inquiry for either approved state or an unusable recipient', () => {
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
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
    const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
    const markup = renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: 'latin' },
      React.createElement(MissionInquiryLink, { station, countryName: 'Singapur' }),
    ));
    expect(markup).toContain(`href="mailto:${station.email}?subject=`);
    expect(markup).toContain('Pitajte misiju za uputstvo');
    expect(markup).toContain('Poruku pregledate i šaljete sami.');
  });
});
