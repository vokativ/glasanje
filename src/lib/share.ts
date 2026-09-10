/**
 * Local download, transfer, clipboard, and public email-field helpers.
 */

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
  isElectionContactConfirmed: boolean;
  isIdDocumentEmbedded: boolean;
  isWetInkSignature: boolean;
  subject: string;
  body: string;
  fullName: string;
}

function temporaryBlock(sections: string[]): string {
  return [
    '*** ПРИВРЕМЕНО УПУТСТВО — ОБРИШИТЕ ОВАЈ БЛОК ПРЕ СЛАЊА ***',
    ...sections,
    '*** КРАЈ ПРИВРЕМЕНОГ УПУТСТВА ***',
  ].join('\n\n');
}

export function buildRecipientPayloads({
  toEmail,
  isElectionContactConfirmed,
  isIdDocumentEmbedded,
  isWetInkSignature,
  subject,
  body,
  fullName,
}: RecipientPayloadInput): {
  standardBody: string;
  dispatchInfo: EmailDispatchInfo;
  webShareInfo: WebShareInfo;
  manualText: string;
} {
  const standardBody = `${body}\n\nС поштовањем,\n${fullName}`;
  const idDocumentInstruction = 'Приложите слику прве стране српског пасоша или личне карте.';
  const composeAttachmentInstructions = [
    isWetInkSignature
      ? 'Приложите скенирану или фотографисану својеручно потписану пријаву.'
      : 'Приложите преузети PDF формулар.',
    ...(!isIdDocumentEmbedded ? [idDocumentInstruction] : []),
  ];
  const mailtoBody = `${temporaryBlock(composeAttachmentInstructions)}\n\n${standardBody}`;
  const webShareInstructions = [
    `У поље „За“ унесите адресу:\n${toEmail}`,
    ...(!isElectionContactConfirmed
      ? [`ПАЖЊА: ${toEmail} је општи јавно објављени контакт мисије и није потврђен за упис у бирачки списак.`]
      : []),
    ...(!isIdDocumentEmbedded ? [idDocumentInstruction] : []),
  ];
  const requiredAttachments = [
    isWetInkSignature
      ? 'скенирана или фотографисана својеручно потписана пријава'
      : 'PDF формулар',
    ...(!isIdDocumentEmbedded
      ? ['слика прве стране српског пасоша или личне карте']
      : []),
  ];

  return {
    standardBody,
    dispatchInfo: { toEmail, subject, body: mailtoBody },
    webShareInfo: {
      subject,
      text: `${temporaryBlock(webShareInstructions)}\n\n${standardBody}`,
    },
    manualText: `${temporaryBlock([
      `За: ${toEmail}`,
      `Наслов: ${subject}`,
      `Обавезни прилози: ${requiredAttachments.join('; ')}.`,
    ])}\n\n${standardBody}`,
  };
}

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

export function canSharePdfFile(): boolean {
  if (typeof File === 'undefined') {
    return false;
  }

  return canShareFile(new File([], 'Zahtev-za-glasanje-2026.pdf', { type: 'application/pdf' }));
}

export async function shareFileWithNativeApp(
  file: File,
  info: WebShareInfo
): Promise<{ success: boolean; error?: string }> {
  if (!canShareFile(file)) {
    return { success: false, error: 'Пренос PDF-а није подржан на овом прегледачу' };
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
      return { success: false, error: 'Пренос PDF-а је отказан' };
    }
    return { success: false, error: 'Пренос PDF-а није успео' };
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
