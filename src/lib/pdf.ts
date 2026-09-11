import type { Color, PDFFont, PDFPage } from 'pdf-lib';

export type SignatureMode = 'screen' | 'wet-ink';

export interface ApplicationFormData {
  fullName: string;
  parentName: string;
  jmbg: string;
  serbianAddress: string;
  foreignAddress: string;
  stationName: string;
  desiredLocation?: string;
  signingDate: string;
  phone: string;
  email: string;
  signatureMode: SignatureMode;
  signaturePngDataUrl: string;
  idDocumentDataUrl?: string;
}

export type PdfGenerationIssueCode =
  | 'invalid-signature-mode'
  | 'invalid-screen-signature'
  | 'field-capacity-exceeded'
  | 'invalid-id-document';

/** A recoverable, user-data issue that prevents PDF bytes from being produced. */
export class PdfGenerationIssue extends Error {
  readonly code: PdfGenerationIssueCode;
  readonly field?: string;

  constructor(code: PdfGenerationIssueCode, message: string, field?: string) {
    super(message);
    this.name = 'PdfGenerationIssue';
    this.code = code;
    this.field = field;
  }
}

const TEMPLATE_URL = '/assets/Zahtev-za-glasanje-u-inostranstvu-2026-09-10.pdf';
const FONT_URL = '/assets/Roboto-Regular.ttf';

let cachedTemplateBytes: ArrayBuffer | null = null;
let cachedFontBytes: ArrayBuffer | null = null;

async function loadAssets(): Promise<{ template: ArrayBuffer; font: ArrayBuffer }> {
  if (cachedTemplateBytes && cachedFontBytes) {
    return { template: cachedTemplateBytes, font: cachedFontBytes };
  }

  const [tplRes, fontRes] = await Promise.all([fetch(TEMPLATE_URL), fetch(FONT_URL)]);

  if (!tplRes.ok) throw new Error(`Неуспешно учитавање PDF шаблона: ${tplRes.statusText}`);
  if (!fontRes.ok) throw new Error(`Неуспешно учитавање фонта: ${fontRes.statusText}`);

  cachedTemplateBytes = await tplRes.arrayBuffer();
  cachedFontBytes = await fontRes.arrayBuffer();

  return { template: cachedTemplateBytes, font: cachedFontBytes };
}

type TextFieldName =
  | 'fullName'
  | 'parentName'
  | 'serbianAddress'
  | 'foreignAddress'
  | 'votingTarget'
  | 'signingDate'
  | 'phone'
  | 'email';

interface MeasuredTextField {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  maxLines: number;
}

/*
 * Baselines are six points above each template rule, leaving the Roboto descender
 * visibly clear of the printed line. Each ruled row accepts exactly one rendered
 * line: adjacent rows provide no safe second-line area, so overflow is rejected
 * rather than drawn across the next field.
 */
const TEMPLATE_TEXT_FIELDS: Record<TextFieldName, MeasuredTextField> = {
  fullName: { x: 286, y: 623, width: 270, fontSize: 10, lineHeight: 12, maxLines: 1 },
  parentName: { x: 286, y: 596, width: 270, fontSize: 10, lineHeight: 12, maxLines: 1 },
  serbianAddress: { x: 286, y: 510, width: 270, fontSize: 9, lineHeight: 12, maxLines: 1 },
  foreignAddress: { x: 286, y: 483, width: 270, fontSize: 9, lineHeight: 12, maxLines: 1 },
  votingTarget: { x: 286, y: 449, width: 270, fontSize: 9, lineHeight: 12, maxLines: 1 },
  signingDate: { x: 105, y: 316, width: 140, fontSize: 10, lineHeight: 12, maxLines: 1 },
  phone: { x: 345, y: 236, width: 200, fontSize: 10, lineHeight: 12, maxLines: 1 },
  email: { x: 345, y: 182, width: 200, fontSize: 10, lineHeight: 12, maxLines: 1 },
};

const TEMPLATE_FIXED_FIELDS = {
  jmbg: { x: 290, y: 538, step: 21, maxDigits: 13, fontSize: 10 },
  signature: { x: 345, y: 282, maxWidth: 150, maxHeight: 50 },
  attachment: { pageWidth: 595.3, pageHeight: 841.9, headerX: 50, headerY: 800, maxWidth: 500, maxHeight: 700, imageTop: 760 },
} as const;

function measureTextForField(
  field: TextFieldName,
  text: string,
  font: PDFFont,
): string[] {
  if (!text) return [];

  const layout = TEMPLATE_TEXT_FIELDS[field];
  const lines: string[] = [];
  let line = '';

  for (const character of text.replace(/\r\n?/g, '\n')) {
    if (character === '\n') {
      lines.push(line);
      line = '';
      continue;
    }

    const candidate = `${line}${character}`;
    const candidateWidth = font.widthOfTextAtSize(candidate, layout.fontSize);
    if (candidateWidth > layout.width) {
      if (!line) {
        throw new PdfGenerationIssue(
          'field-capacity-exceeded',
          `Polje „${field}” ne može čitljivo da stane u predviđeni prostor obrasca. PDF nije napravljen.`,
          field,
        );
      }
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }

  if (line || lines.length) lines.push(line);

  if (lines.length > layout.maxLines) {
    throw new PdfGenerationIssue(
      'field-capacity-exceeded',
      `Polje „${field}” ne može čitljivo da stane u predviđeni prostor obrasca. PDF nije napravljen.`,
      field,
    );
  }

  return lines;
}

function drawMeasuredText(
  page: PDFPage,
  field: TextFieldName,
  lines: string[],
  font: PDFFont,
  color: Color,
): void {
  const layout = TEMPLATE_TEXT_FIELDS[field];
  lines.forEach((line, index) => {
    if (!line) return;
    page.drawText(line, {
      x: layout.x,
      y: layout.y - index * layout.lineHeight,
      size: layout.fontSize,
      font,
      color,
    });
  });
}

function requireScreenSignatureDataUrl(data: ApplicationFormData): string | undefined {
  if (data.signatureMode === 'wet-ink') return undefined;
  if (data.signatureMode !== 'screen') {
    throw new PdfGenerationIssue(
      'invalid-signature-mode',
      'Način potpisivanja nije važeći. Vratite se na korak za potpis i izaberite način potpisivanja.',
    );
  }
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.signaturePngDataUrl)) {
    throw new PdfGenerationIssue(
      'invalid-screen-signature',
      'Potpis na ekranu nedostaje ili nije u važećem PNG formatu. Vratite se na korak za potpis i potpišite obrazac ponovo.',
    );
  }

  return data.signaturePngDataUrl;
}

export async function generateApplicationPdf(data: ApplicationFormData): Promise<Uint8Array> {
  const screenSignatureDataUrl = requireScreenSignatureDataUrl(data);
  const [{ template, font }, { PDFDocument, rgb }, { default: fontkit }] = await Promise.all([
    loadAssets(),
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
  ]);

  const pdfDoc = await PDFDocument.load(template);
  pdfDoc.registerFontkit(fontkit);
  const robotoFont = await pdfDoc.embedFont(font);
  const [page1] = pdfDoc.getPages();
  const votingTarget = data.desiredLocation
    ? `${data.desiredLocation} (${data.stationName})`
    : data.stationName;

  const measuredText = {
    fullName: measureTextForField('fullName', data.fullName, robotoFont),
    parentName: measureTextForField('parentName', data.parentName, robotoFont),
    serbianAddress: measureTextForField('serbianAddress', data.serbianAddress, robotoFont),
    foreignAddress: measureTextForField('foreignAddress', data.foreignAddress, robotoFont),
    votingTarget: measureTextForField('votingTarget', votingTarget, robotoFont),
    signingDate: measureTextForField('signingDate', data.signingDate, robotoFont),
    phone: measureTextForField('phone', data.phone, robotoFont),
    email: measureTextForField('email', data.email, robotoFont),
  };
  const black = rgb(0, 0, 0);

  drawMeasuredText(page1, 'fullName', measuredText.fullName, robotoFont, black);
  drawMeasuredText(page1, 'parentName', measuredText.parentName, robotoFont, black);

  const jmbgDigits = data.jmbg.replace(/\D/g, '').split('');
  if (jmbgDigits.length > TEMPLATE_FIXED_FIELDS.jmbg.maxDigits) {
    throw new PdfGenerationIssue(
      'field-capacity-exceeded',
      'Polje „jmbg” ne može da stane u predviđena polja obrasca. PDF nije napravljen.',
      'jmbg',
    );
  }
  jmbgDigits.forEach((digit, index) => {
    page1.drawText(digit, {
      x: TEMPLATE_FIXED_FIELDS.jmbg.x + index * TEMPLATE_FIXED_FIELDS.jmbg.step,
      y: TEMPLATE_FIXED_FIELDS.jmbg.y,
      size: TEMPLATE_FIXED_FIELDS.jmbg.fontSize,
      font: robotoFont,
      color: black,
    });
  });

  drawMeasuredText(page1, 'serbianAddress', measuredText.serbianAddress, robotoFont, black);
  drawMeasuredText(page1, 'foreignAddress', measuredText.foreignAddress, robotoFont, black);
  drawMeasuredText(page1, 'votingTarget', measuredText.votingTarget, robotoFont, black);
  drawMeasuredText(page1, 'signingDate', measuredText.signingDate, robotoFont, black);

  if (screenSignatureDataUrl) {
    let signatureImage;
    try {
      signatureImage = await pdfDoc.embedPng(screenSignatureDataUrl);
    } catch {
      throw new PdfGenerationIssue(
        'invalid-screen-signature',
        'Potpis na ekranu je oštećen i ne može da se ugradi u PDF. Vratite se na korak za potpis i potpišite obrazac ponovo.',
      );
    }

    const scale = Math.min(
      TEMPLATE_FIXED_FIELDS.signature.maxWidth / signatureImage.width,
      TEMPLATE_FIXED_FIELDS.signature.maxHeight / signatureImage.height,
      1,
    );
    page1.drawImage(signatureImage, {
      x: TEMPLATE_FIXED_FIELDS.signature.x,
      y: TEMPLATE_FIXED_FIELDS.signature.y,
      width: signatureImage.width * scale,
      height: signatureImage.height * scale,
    });
  }

  drawMeasuredText(page1, 'phone', measuredText.phone, robotoFont, black);
  drawMeasuredText(page1, 'email', measuredText.email, robotoFont, black);

  if (data.idDocumentDataUrl) {
    const isPng = data.idDocumentDataUrl.startsWith('data:image/png;base64,');
    const isJpeg = data.idDocumentDataUrl.startsWith('data:image/jpeg;base64,');
    if (!isPng && !isJpeg) {
      throw new PdfGenerationIssue(
        'invalid-id-document',
        'Prilog ličnog dokumenta mora biti JPG ili PNG slika.',
      );
    }

    let embeddedImage;
    try {
      embeddedImage = isPng
        ? await pdfDoc.embedPng(data.idDocumentDataUrl)
        : await pdfDoc.embedJpg(data.idDocumentDataUrl);
    } catch {
      throw new PdfGenerationIssue(
        'invalid-id-document',
        'Priložena slika dokumenta ne može da se ugradi u PDF. Izaberite drugu JPG ili PNG sliku.',
      );
    }

    const attachment = TEMPLATE_FIXED_FIELDS.attachment;
    const page2 = pdfDoc.addPage([attachment.pageWidth, attachment.pageHeight]);
    page2.drawText('КОПИЈА ИДЕНТИФИКАЦИОНОГ ДОКУМЕНТА (ПАСОШ / ЛИЧНА КАРТА)', {
      x: attachment.headerX,
      y: attachment.headerY,
      size: 11,
      font: robotoFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    page2.drawText('Прилог уз Захтев за упис у бирачки списак податка да ће бирач гласати у иностранству', {
      x: attachment.headerX,
      y: attachment.headerY - 15,
      size: 9,
      font: robotoFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    const scale = Math.min(
      attachment.maxWidth / embeddedImage.width,
      attachment.maxHeight / embeddedImage.height,
      1,
    );
    const imageWidth = embeddedImage.width * scale;
    const imageHeight = embeddedImage.height * scale;
    page2.drawImage(embeddedImage, {
      x: (attachment.pageWidth - imageWidth) / 2,
      y: attachment.imageTop - imageHeight,
      width: imageWidth,
      height: imageHeight,
    });
  }

  return pdfDoc.save();
}
