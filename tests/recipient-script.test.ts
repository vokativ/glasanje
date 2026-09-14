import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import { COUNTRY_BY_CODE } from '../src/data/missions';
import { StepExportAndSubmit } from '../src/components/StepExportAndSubmit';
import { ScriptProvider } from '../src/lib/script';
import { buildRecipientPayloads } from '../src/lib/share';

test('registration email follows the chosen script for either signature mode and preserves entered names', () => {
  const station = COUNTRY_BY_CODE.get('SG')!.stations[0];
  const fullName = 'Тест Čedomir Example';
  for (const script of ['latin', 'cyrillic'] as const) for (const isWetInkSignature of [false, true]) {
    const markup = renderToStaticMarkup(React.createElement(ScriptProvider, { initialScript: script },
      React.createElement(StepExportAndSubmit, {
        formData: { fullName, parentName: 'Test', jmbg: '0101990710008', serbianAddress: 'Test', foreignAddress: 'Test', stationName: station.embassyCyr, signingDate: '14.09.2026.', phone: '+381601234567', email: 'qa@example.com', signaturePngDataUrl: '' },
        station, countryName: 'Singapur', countryNameCyr: 'Сингапур', countryCode: 'SG', isWetInkSignature,
        onBack: () => undefined, onReset: () => undefined,
      }),
    ));
    const mail = new URL(markup.match(/href="(mailto:[^"]+)"/)![1].replaceAll('&amp;', '&'));
    expect(mail.pathname).toBe(station.email);
    expect(mail.searchParams.get('subject')).toBe(script === 'latin'
      ? 'Prijava za glasanje iz inostranstva — izbori 2026.'
      : 'Пријава за гласање из иностранства — избори 2026.');
    expect(mail.searchParams.get('body')).toContain(script === 'latin' ? 'Država boravka: Singapur' : 'Држава боравка: Сингапур');
    expect(mail.searchParams.get('body')).toContain(script === 'latin' ? station.embassy : station.embassyCyr);
    expect(mail.searchParams.get('body')).toContain(fullName);
  }
});

test('Latin copy/share instructions preserve recipient addresses and caller-supplied text', () => {
  const payload = buildRecipientPayloads({ toEmail: 'mission@example.com', electionContactApproval: 'unconfirmed', isIdDocumentEmbedded: false, isWetInkSignature: false, subject: 'Upit', body: 'Текст корисника', fullName: 'Đorđe Петровић', script: 'latin' });
  expect(payload.manualText).toContain('Za: mission@example.com');
  expect(payload.webShareInfo.text).toContain('PAŽNJA: mission@example.com');
  expect(payload.dispatchInfo.body).toContain('PRIVREMENO UPUTSTVO');
  for (const text of [payload.manualText, payload.webShareInfo.text, payload.dispatchInfo.body]) {
    expect(text).toContain('Текст корисника');
    expect(text).toContain('S poštovanjem,\nĐorđe Петровић');
  }
});
