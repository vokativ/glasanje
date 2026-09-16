import type { ElectionNotice } from '../data/missions';
import { translateStaticText, type Script } from './script';
import { getStationElectionStatus } from './stationElectionStatus';


export interface EmailDispatchInfo {
  toEmail: string;
  subject: string;
  body: string;
}

export interface WebShareInfo {
  subject: string;
  text: string;
}

export interface RecipientPayloadInput {
  toEmail: string;
  electionContactApproval: 'source-confirmed' | 'operator-approved' | 'unconfirmed';
  electionNotice?: ElectionNotice;
  isIdDocumentEmbedded: boolean;
  isWetInkSignature: boolean;
  subject: string;
  body: string;
  fullName: string;
  script?: Script;
}

function temporaryBlock(sections: string[], script: Script): string {
  return [
    translateStaticText(script, '*** PRIVREMENO UPUTSTVO — OBRIŠITE OVAJ BLOK PRE SLANJA ***'),
    ...sections,
    translateStaticText(script, '*** KRAJ PRIVREMENOG UPUTSTVA ***'),
  ].join('\n\n');
}

/**
 * Builds the alternatives a person can use to address and attach an
 * application. It only describes required attachments—it cannot attach files
 * through `mailto:` or a native share sheet. Contact approval controls
 * guidance only; it is not proof that a mission will accept the message.
 */

export function buildRecipientPayloads({
  toEmail,
  electionContactApproval,
  electionNotice,
  isIdDocumentEmbedded,
  isWetInkSignature,
  subject,
  body,
  fullName,
  script = 'cyrillic',
}: RecipientPayloadInput): {
  standardBody: string;
  dispatchInfo: EmailDispatchInfo;
  webShareInfo: WebShareInfo;
  manualText: string;
} {
  // Translate only helper-owned copy. The supplied body/name may deliberately
  // use a different script; transliterating the assembled message would corrupt
  // those values (and potentially the exact destination mailbox).
  const t = (text: string) => translateStaticText(script, text);
  const stationStatus = getStationElectionStatus({ electionContactApproval, electionNotice });
  const standardBody = `${body}\n\n${t('S poštovanjem,')}\n${fullName}`;
  const idDocumentInstruction = t('Priložite sliku prve strane srpskog pasoša ili lične karte.');
  const composeAttachmentInstructions = [
    isWetInkSignature
      ? t('Priložite skeniranu ili fotografisanu svojeručno potpisanu prijavu.')
      : `${t('Priložite preuzeti ')}PDF${t(' formular.')}`,
    ...(!isIdDocumentEmbedded ? [idDocumentInstruction] : []),
    ...(stationStatus === 'notice-no-email'
      ? [t('Preporučujemo da u poruci zatražite potvrdu prijema poruke od misije.')]
      : []),
  ];
  const mailtoBody = `${temporaryBlock(composeAttachmentInstructions, script)}\n\n${standardBody}`;
  const webShareInstructions = [
    `${t('U polje „Za“ unesite adresu:')}\n${toEmail}`,
    ...(stationStatus === 'notice-no-email'
      ? [`${t('PAŽNJA:')} ${toEmail}${t(' je opšti kontakt misije. U obaveštenju za izbore 2026. nije navedena posebna i-mejl adresa. Preporučujemo da u poruci zatražite potvrdu prijema.')}`]
      : stationStatus === 'unconfirmed'
      ? [`${t('PAŽNJA:')} ${toEmail}${t(' je opšti javno objavljeni kontakt misije i nije potvrđen za upis u birački spisak.')}`]
      : []),
    ...(!isIdDocumentEmbedded ? [idDocumentInstruction] : []),
  ];
  const requiredAttachments = [
    isWetInkSignature
      ? t('skenirana ili fotografisana svojeručno potpisana prijava')
      : `PDF${t(' formular')}`,
    ...(!isIdDocumentEmbedded
      ? [t('slika prve strane srpskog pasoša ili lične karte')]
      : []),
  ];

  return {
    standardBody,
    dispatchInfo: { toEmail, subject, body: mailtoBody },
    webShareInfo: {
      subject,
      text: `${temporaryBlock(webShareInstructions, script)}\n\n${standardBody}`,
    },
    manualText: `${temporaryBlock([
      `${t('Za:')} ${toEmail}`,
      ...(stationStatus === 'notice-no-email'
        ? [`${t('PAŽNJA:')} ${toEmail}${t(' je opšti kontakt misije (u obaveštenju za izbore 2026. nije navedena posebna i-mejl adresa). Preporučujemo da zatražite potvrdu prijema.')}`]
        : []),
      `${t('Naslov:')} ${subject}`,
      `${t('Obavezni prilozi:')} ${requiredAttachments.join('; ')}.`,
    ], script)}\n\n${standardBody}`,
  };
}

/**
 * Tests this browser's current secure-context capability for this exact file.
 * A positive result is advisory: the user can still cancel or the target app
 * can reject the attachment, and no file is transferred during this check.
 */

export function canShareFile(file: File): boolean {
  if (
    typeof window === 'undefined'
    || !window.isSecureContext
    || !navigator.share
    || !navigator.canShare
  ) {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Probes PDF sharing with an empty representative file; it does not validate a real PDF. */

export function canSharePdfFile(): boolean {
  if (typeof File === 'undefined') {
    return false;
  }

  return canShareFile(new File([], 'Zahtev-za-glasanje-2026.pdf', { type: 'application/pdf' }));
}

/**
 * Hands a PDF and accompanying text to the native share UI only after the
 * capability check. It reports cancellation and share failures without
 * exposing the file or recipient data in an error value.
 */

export async function shareFileWithNativeApp(
  file: File,
  info: WebShareInfo,
  script: Script,
): Promise<{ success: boolean; error?: string }> {
  if (!canShareFile(file)) {
    return { success: false, error: translateStaticText(script, 'Prenos PDF-a nije podržan na ovom pregledaču') };
  }

  try {
    await navigator.share({
      files: [file],
      title: info.subject,
      text: info.text,
    });
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: translateStaticText(script, 'Prenos PDF-a je otkazan') };
    }
    return { success: false, error: translateStaticText(script, 'Prenos PDF-a nije uspeo') };
  }
}

/**
 * Provider compose URLs are unreliable on narrow mobile browsers. This display
 * choice is intentionally separate from Web Share capability detection.
 */
export function isNarrowMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(max-width: 767px)').matches
    && /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
}

/**
 * Starts a browser-local PDF download. The caller owns the bytes and filename;
 * the temporary object URL is delayed before revocation so the browser can
 * begin the download.
 */

export function downloadFile(data: Uint8Array, filename: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Copies text into the user's local clipboard, first through the modern API
 * and then the legacy browser path. Clipboard permission or browser policy can
 * make both paths fail, which is reported as `false`.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  }
}

export interface InvitationShareInfo {
  title: string;
  text: string;
  url: string;
  closing: string;
}

export type InvitationShareResult =
  | { success: true; method: 'native' | 'clipboard' }
  | { success: false; error: string };

/** Forms the complete invitation text locally; it does not invoke a share target. */

export function buildInvitationCopyText(info: InvitationShareInfo): string {
  return `${info.text}\n\n${info.url}\n\n${info.closing}`;
}

/**
 * Uses native text sharing when available, otherwise attempts a local
 * clipboard copy. Native share errors do not fall back because cancellation
 * must remain distinguishable from an intentional copy action.
 */

export async function shareInvitation(
  info: InvitationShareInfo,
  script: Script,
  copy = copyTextToClipboard,
): Promise<InvitationShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: info.title, text: buildInvitationCopyText(info) });
      return { success: true, method: 'native' };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: translateStaticText(script, 'Deljenje poziva je otkazano.') };
      }
      return { success: false, error: translateStaticText(script, 'Deljenje poziva nije uspelo.') };
    }
  }

  try {
    return (await copy(buildInvitationCopyText(info)))
      ? { success: true, method: 'clipboard' }
      : { success: false, error: translateStaticText(script, 'Kopiranje poziva nije uspelo.') };
  } catch {
    return { success: false, error: translateStaticText(script, 'Kopiranje poziva nije uspelo.') };
  }
}

/**
 * Returns compose links with all fields URL-encoded. Opening one delegates the
 * supplied recipient, subject, and body to that external mail provider; this
 * helper neither opens the link nor attaches documents.
 */

export function getWebmailLinks(info: EmailDispatchInfo) {
  const encTo = encodeURIComponent(info.toEmail);
  const encSu = encodeURIComponent(info.subject);
  const encBody = encodeURIComponent(info.body);

  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSu}&body=${encBody}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${encTo}&subject=${encSu}&body=${encBody}`,
    yahoo: `https://compose.mail.yahoo.com/?to=${encTo}&subject=${encSu}&body=${encBody}`,
    mailto: `mailto:${info.toEmail}?subject=${encSu}&body=${encBody}`,
  };
}
