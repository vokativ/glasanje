import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import { COUNTRIES } from '../src/data/missions';
import { groupCoverageCountries, RegistrationEmailStatusPage } from '../src/components/RegistrationEmailStatusPage';
import { ScriptProvider } from '../src/lib/script';
import { existsSync } from 'node:fs';

test('all countries appear exactly once in Serbian alphabetical groups for either script', () => {
  for (const script of ['cyrillic', 'latin'] as const) {
    const groups = groupCoverageCountries(script);
    const codes = groups.flatMap(group => group.countries.map(country => country.countryCode));
    expect(codes.length).toBe(COUNTRIES.length);
    expect(new Set(codes).size).toBe(COUNTRIES.length);
    expect(new Set(groups.map(group => group.letter)).size).toBe(groups.length);
    if (script === 'latin') {
      expect(groups.find(group => group.letter === 'Dž')!.countries.map(country => country.countryCode)).toContain('DJ');
      expect(groups.findIndex(group => group.letter === 'Dž')).toBe(groups.findIndex(group => group.letter === 'D') + 1);
    } else {
      expect(groups.find(group => group.letter === 'Џ')!.countries.map(country => country.countryCode)).toContain('DJ');
    }
  }
});

test('the static list exposes every country and distinguishes partial mission confirmation', () => {
  const markup = renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: 'latin' },
    React.createElement(RegistrationEmailStatusPage),
  ));
  expect(markup).not.toContain('<select');
  // The app has <base href="/">, so bare fragment links would leave /status.
  expect(markup).toContain('href="/status?script=latin#coverage-letter-AL"');
  expect(markup).not.toContain('href="#coverage-letter-');
  expect(markup.match(/class="coverage-country"/g)!.length).toBe(COUNTRIES.length);
  const summary = (code: string) => markup.split(`id="coverage-country-${code}"`)[1].split('</summary>')[0];
  expect(summary('AT')).toContain('coverage-status--confirmed');
  expect(summary('SG')).toContain('coverage-status--confirmed');
  expect(summary('AF')).toContain('coverage-status--unconfirmed');
  expect(summary('TR')).toContain('coverage-status--notice');
  expect(summary('TR')).toContain('Obaveštenje objavljeno');
  expect(summary('BA')).toContain('coverage-status--confirmed');
  const croatia = COUNTRIES.find(country => country.countryCode === 'HR')!;
  const confirmed = croatia.stations.filter(station => station.electionContactApproval !== 'unconfirmed').length;
  expect(summary('HR')).toContain(`Delimično · ${confirmed}/${croatia.stations.length}`);
  expect(summary('HR')).toContain('coverage-status--partial');
  for (const country of COUNTRIES) {
    expect(summary(country.countryCode)).toContain(country.label.replaceAll('&', '&amp;'));
    const flag = `/assets/flags/${country.countryCode.toLowerCase()}.svg`;
    expect(summary(country.countryCode)).toContain(`src="${flag}"`);
    expect(summary(country.countryCode)).toContain('alt=""');
    expect(existsSync(new URL(`../public${flag}`, import.meta.url))).toBe(true);
    expect(markup).toContain(`href="/?country=${country.countryCode}&amp;script=latin"`);
  }
});
