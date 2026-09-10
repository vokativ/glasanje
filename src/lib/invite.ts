import { Script, translateStaticText } from './script';

export interface InvitationInfo {
  title: string;
  text: string;
  url: string;
  closing: string;
}

export function getInitialDesiredLocation(search: string): string {
  const destinationParameters = new URLSearchParams(search).getAll('destination');
  if (destinationParameters.length !== 1) return '';

  return destinationParameters[0].trim();
}

export function buildInvitationUrl(origin: string, pathname: string, desiredLocation: string): string {
  const url = new URL(pathname, origin);
  url.search = '';
  url.hash = '';
  url.searchParams.set('destination', desiredLocation.trim());
  return url.toString();
}

export function buildInvitationInfo(
  origin: string,
  pathname: string,
  desiredLocation: string,
  script: Script,
): InvitationInfo {
  const destination = desiredLocation.trim();

  return {
    title: translateStaticText(script, 'Glasanje u inostranstvu'),
    text: `${translateStaticText(script, 'Popuni i ti prijavu za glasanje u inostranstvu za željeno mesto:')} ${destination}.\n\n${translateStaticText(script, 'Ukupno vreme za ceo proces: 1 minut.')}`,
    url: buildInvitationUrl(origin, pathname, destination),
    closing: translateStaticText(script, 'Živela Srbija!'),
  };
}
