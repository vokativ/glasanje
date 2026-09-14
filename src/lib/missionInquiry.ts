import type { PollingStation } from '../data/missions';
import { translateStaticText, type Script } from './script';
import { getWebmailLinks } from './share';
import { validateEmail } from './validators';

// Current election instructions, including Article 16 and the request deadline:
// https://mduls.gov.rs/obavestenja/obavestava-birace-koji-imaju-boraviste-u-inostranstvu-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine/
// Use the already-resolved mission contact. This inquiry neither establishes
// election-recipient approval nor includes the applicant's personal form data.
export function buildMissionInquiryUrl(
  station: Pick<PollingStation, 'email' | 'electionContactApproval'>,
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
    t('Kada i gde će biti objavljeno uputstvo za prijavu za glasanje na izborima 25. oktobra 2026. godine? Na koju i-mejl adresu mogu da pošaljem potpisan zahtev i priloge? Ako je uputstvo već objavljeno, molim vas za link.'),
    t('Prema obaveštenju MDULS, na osnovu člana 16. Zakona o jedinstvenom biračkom spisku, rok za podnošenje zahteva je 3. oktobar 2026. u ponoć po vremenu u Srbiji. Molim vas za uputstvo kako da podnesem zahtev u tom roku.'),
    t('Hvala i srdačan pozdrav.'),
  ].join('\r\n\r\n');
  return getWebmailLinks({ toEmail: email, subject, body }).mailto;
}
