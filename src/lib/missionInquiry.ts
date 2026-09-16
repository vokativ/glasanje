import type { PollingStation } from '../data/missions';
import { translateStaticText, type Script } from './script';
import { getWebmailLinks } from './share';
import { validateEmail } from './validators';

// Current election instructions, including Article 16 and the request deadline:
// https://mduls.gov.rs/obavestenja/obavestava-birace-koji-imaju-boraviste-u-inostranstvu-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine/
// Use the already-resolved mission contact. This inquiry neither establishes
// election-recipient approval nor includes the applicant's personal form data.
//
// Notice Adaptation & Script Purity Contract:
// - When an official 2026 election notice exists (yellow state), the inquiry acknowledges
//   that an announcement is already published on the mission website and asks whether the
//   general contact accepts requests or if another submission method is designated.
// - When no notice exists (red state), the inquiry asks when instructions will be published.
// - The message body avoids embedding untranslated raw URLs or emails inline so that
//   Cyrillic mode maintains 100% script purity without triggering opposite-script test failures.
export function buildMissionInquiryUrl(
  station: Pick<PollingStation, 'email' | 'electionContactApproval' | 'electionNotice'>,
  countryName: string,
  script: Script,
): string | null {
  const email = station.email.trim();
  if (station.electionContactApproval !== 'unconfirmed' || !validateEmail(email) || !countryName.trim()) {
    return null;
  }
  const t = (text: string) => translateStaticText(script, text);
  const subject = `${t('Upit o prijavi za glasanje 2026.')} — ${countryName}`;
  const body = [
    t('Poštovani,'),
    `${t('Državljanin/državljanka sam Republike Srbije. Država u kojoj boravim:')} ${countryName}.`,
    ...(station.electionNotice?.electionYear === '2026' && station.electionNotice.url
      ? [
          t('Upoznat/a sam sa zvaničnim obaveštenjem za izbore 2026. godine na vašem sajtu. Kako u tekstu obaveštenja nije navedena posebna i-mejl adresa za prijem zahteva, molim vas za informaciju da li potpisan zahtev i priloge mogu poslati na ovu adresu ili postoji druga adresa/način za dostavljanje?'),
          t('Prema obaveštenju MDULS, na osnovu člana 16. Zakona o jedinstvenom biračkom spisku, rok za podnošenje zahteva je 3. oktobar 2026. u ponoć po vremenu u Srbiji. Molim vas za uputstvo kako da podnesem zahtev u tom roku.'),
        ]
      : [
          t('Kada i gde će biti objavljeno uputstvo za prijavu za glasanje na izborima 25. oktobra 2026. godine? Na koju i-mejl adresu mogu da pošaljem potpisan zahtev i priloge? Ako je uputstvo već objavljeno, molim vas za link.'),
          t('Prema obaveštenju MDULS, na osnovu člana 16. Zakona o jedinstvenom biračkom spisku, rok za podnošenje zahteva je 3. oktobar 2026. u ponoć po vremenu u Srbiji. Molim vas za uputstvo kako da podnesem zahtev u tom roku.'),
        ]),
    t('Hvala i srdačan pozdrav.'),
  ].join('\r\n\r\n');
  return getWebmailLinks({ toEmail: email, subject, body }).mailto;
}
