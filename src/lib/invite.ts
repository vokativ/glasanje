/**
 * Creates shareable invitation copy from the selected destination without
 * storing or sending it. Query parsing accepts exactly one destination so an
 * ambiguous or repeated URL cannot silently prefill a different location.
 */

import { Script, translateStaticText } from './script';

export interface InvitationInfo {
  title: string;
  text: string;
  url: string;
  closing: string;
}

/**
 * Returns one trimmed `destination` query value, or an empty value when the
 * URL is absent or ambiguous. Callers must treat an empty result as no prefill.
 */

export function getInitialDesiredLocation(search: string): string {
  const destinationParameters = new URLSearchParams(search).getAll('destination');
  if (destinationParameters.length !== 1) return '';

  return destinationParameters[0].trim();
}

/**
 * Builds a canonical invitation URL from the current origin and path. Existing
 * query parameters and fragments are intentionally discarded; only the
 * trimmed destination is carried in the URL for the recipient to open.
 */

export function buildInvitationUrl(origin: string, pathname: string, desiredLocation: string): string {
  const url = new URL(pathname, origin);
  url.search = '';
  url.hash = '';
  url.searchParams.set('destination', desiredLocation.trim());
  return url.toString();
}

/**
 * Produces display/share text locally. The destination remains user-entered
 * content and is copied verbatim (after trimming), not transliterated or
 * validated as an official voting-location record.
 */

export function buildInvitationInfo(
  origin: string,
  pathname: string,
  desiredLocation: string,
  script: Script,
): InvitationInfo {
  const destination = desiredLocation.trim();

  return {
    title: translateStaticText(script, 'Podelite sa prijateljima'),
    text: `${translateStaticText(script, 'Popuni i ti prijavu za glasanje u inostranstvu za željeno mesto:')} ${destination}.\n\n${translateStaticText(script, 'Ukupno vreme za ceo proces: 1 minut.')}`,
    url: buildInvitationUrl(origin, pathname, destination),
    closing: translateStaticText(script, 'Živela Srbija!'),
  };
}
