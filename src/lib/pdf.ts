
/**
 * Fills the bundled application-template PDF entirely in the browser. Form
 * values and document images are embedded only in the returned bytes; this
 * module does not submit or otherwise transmit them.
 */

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
  signaturePngDataUrl: string;
  idDocumentDataUrl?: string; // Optional Page 2 passport/ID copy
}

// These static assets must remain compatible with the fixed field coordinates
// below: the first template page is the application form and Roboto supplies
// the Serbian glyphs that the generated entries require.

const TEMPLATE_URL = '/assets/Zahtev-za-glasanje-u-inostranstvu-2026-09-10.pdf';
const FONT_URL = '/assets/Roboto-Regular.ttf';

// Cache immutable asset bytes only. Never cache ApplicationFormData, which can
// contain identity and contact information.

type PdfAssets = { template: ArrayBuffer; font: ArrayBuffer };
let assetPromise: Promise<PdfAssets> | null = null;

/**
 * Share one in-flight request between startup preloading and an early export.
 * Keep successful bytes in this module's memory, not just the HTTP cache: a
 * later offline export must not need another fetch. Publish the pair only after
 * both bodies finish reading. Clear a rejection so reconnect/export can retry.
 * No application fields, signatures or ID images belong in this shared cache.
 */
function loadAssets(): Promise<PdfAssets> {
  if (!assetPromise) {
    assetPromise = (async () => {
      const [tplRes, fontRes] = await Promise.all([fetch(TEMPLATE_URL), fetch(FONT_URL)]);
      if (!tplRes.ok) throw new Error(`Неуспешно учитавање PDF шаблона: ${tplRes.statusText}`);
      if (!fontRes.ok) throw new Error(`Неуспешно учитавање фонта: ${fontRes.statusText}`);
      const [template, font] = await Promise.all([tplRes.arrayBuffer(), fontRes.arrayBuffer()]);
      return { template, font };
    })().catch(error => {
      assetPromise = null;
      throw error;
    });
  }
  return assetPromise;
}

/**
 * Loading a screen alone does not load its nested dynamic imports. Warm the
 * actual PDF engines as well as the form/font, without generating any personal
 * document. The browser's module cache reuses these exact imports in export.
 */
export async function preloadPdfResources(): Promise<void> {
  await Promise.all([loadAssets(), import('pdf-lib'), import('@pdf-lib/fontkit')]);
}


/**
 * Overlays supplied values onto the first page of the fixed template and
 * returns a standalone PDF. Coordinates are PDF points measured from the
 * lower-left; changing the template layout requires reviewing every placement.
 * Missing page/font/template compatibility therefore fails generation rather
 * than creating a plausibly incorrect official-looking form.
 */

export async function generateApplicationPdf(data: ApplicationFormData): Promise<Uint8Array> {
  const [{ template, font }, { PDFDocument, rgb }, { default: fontkit }] = await Promise.all([
    loadAssets(),
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
  ]);

  const pdfDoc = await PDFDocument.load(template);
  pdfDoc.registerFontkit(fontkit);
  const robotoFont = await pdfDoc.embedFont(font);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  // Text wraps to stay inside each template field, but deliberately does not
  // truncate or paginate: callers must keep field values within the form's space.

  const writeWrappedText = (
    page: typeof page1,
    text: string,
    x: number,
    y: number,
    font: typeof robotoFont,
    fontSize: number = 10,
    maxWidth: number = 260,
    lineHeight: number = 13
  ): void => {
    if (!text) return;

    const words = text.trim().split(/\s+/);
    let currentLine = '';
    let currentY = y;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        page.drawText(currentLine, { x, y: currentY, size: fontSize, font, color: rgb(0, 0, 0) });
        currentLine = word;
        currentY -= lineHeight;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, { x, y: currentY, size: fontSize, font, color: rgb(0, 0, 0) });
    }
  };


  // Fixed coordinates mirror the numbered fields in TEMPLATE_URL; they are not
  // semantic layout rules and must move with a replacement template.

  // 1. Име и презиме
  writeWrappedText(page1, data.fullName, 286, 617, robotoFont, 10, 270);

  // 2. Име једног родитеља
  writeWrappedText(page1, data.parentName, 286, 590, robotoFont, 10, 270);

  // 3. ЈМБГ (13 цифара исписаних са фиксним кораком)
  const jmbgDigits = data.jmbg.replace(/\D/g, '').split('');
  let jmbgX = 290;
  for (const digit of jmbgDigits) {
    page1.drawText(digit, {
      x: jmbgX,
      y: 538,
      size: 10,
      font: robotoFont,
      color: rgb(0, 0, 0),
    });
    jmbgX += 21;
  }

  // 4. Адреса пребивалишта у Р. Србији
  writeWrappedText(page1, data.serbianAddress, 286, 510, robotoFont, 9, 270, 12);

  // 5. Адреса боравка у иностранству
  writeWrappedText(page1, data.foreignAddress, 286, 477, robotoFont, 9, 270, 12);

  // 6. Град, држава - где желим да гласам у иностранству
  const votingTarget = data.desiredLocation
    ? `${data.desiredLocation} (${data.stationName})`
    : data.stationName;
  writeWrappedText(page1, votingTarget, 286, 443, robotoFont, 9, 270, 12);

  // Датум
  page1.drawText(data.signingDate, {
    x: 105,
    y: 310,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

  // Only a PNG data URL can occupy the signature box. An unreadable signature is
  // omitted after the embedding failure so one image does not prevent PDF export.

  // Потпис (PNG са потписом)
  if (data.signaturePngDataUrl && data.signaturePngDataUrl.startsWith('data:image/png;base64,')) {
    try {
      const signatureImage = await pdfDoc.embedPng(data.signaturePngDataUrl);
      const scaled = signatureImage.scale(0.24);
      // Ограничи максималну ширину/висину потписа
      const maxW = 150;
      const maxH = 50;
      let w = scaled.width;
      let h = scaled.height;
      if (w > maxW) {
        h = h * (maxW / w);
        w = maxW;
      }
      if (h > maxH) {
        w = w * (maxH / h);
        h = maxH;
      }
      page1.drawImage(signatureImage, {
        x: 345,
        y: 282,
        width: w,
        height: h,
      });
    } catch (err) {
      console.warn('Грешка при уметању потписа у PDF:', err);
    }
  }

  // Контакт телефон
  page1.drawText(data.phone, {
    x: 345,
    y: 230,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

  // И-мејл
  page1.drawText(data.email, {
    x: 345,
    y: 176,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

  // A supplied ID image becomes a new PDF page, keeping it separate from the
  // application template rather than attempting to place it in a form field.

  // Опциона страна 2: Копија пасоша / личне карте
  if (data.idDocumentDataUrl) {
    const isPng = data.idDocumentDataUrl.startsWith('data:image/png;base64,');
    const isJpeg = data.idDocumentDataUrl.startsWith('data:image/jpeg;base64,');
    if (!isPng && !isJpeg) {
      // MIME prefixes are an input-format boundary. Reject unsupported images
      // before creating a document that merely appears to contain the attachment.

      throw new Error('Прилог личног документа мора бити JPG или PNG слика.');
    }

    let embeddedImage;
    try {
      embeddedImage = isPng
        ? await pdfDoc.embedPng(data.idDocumentDataUrl)
        : await pdfDoc.embedJpg(data.idDocumentDataUrl);
    } catch {
      throw new Error('Приложена слика документа не може да се угради у PDF. Изаберите другу JPG или PNG слику.');
    }

    const page2 = pdfDoc.addPage([595.3, 841.9]); // Standard A4
    // A4 points and margins are explicit so the copied document remains fully
    // visible; the image is never enlarged beyond its source dimensions.

    // Заглавље стране 2
    page2.drawText('КОПИЈА ИДЕНТИФИКАЦИОНОГ ДОКУМЕНТА (ПАСОШ / ЛИЧНА КАРТА)', {
      x: 50,
      y: 800,
      size: 11,
      font: robotoFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    page2.drawText('Прилог уз Захтев за упис у бирачки списак податка да ће бирач гласати у иностранству', {
      x: 50,
      y: 785,
      size: 9,
      font: robotoFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Скалирај слику да уредно стане на А4 (макс ширина 500, макс висина 700)
    const maxImgW = 500;
    const maxImgH = 700;
    let imgW = embeddedImage.width;
    let imgH = embeddedImage.height;

    const scale = Math.min(maxImgW / imgW, maxImgH / imgH, 1);
    imgW = imgW * scale;
    imgH = imgH * scale;

    const imgX = (595.3 - imgW) / 2;
    const imgY = 760 - imgH;

    page2.drawImage(embeddedImage, {
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    });
  }

  return await pdfDoc.save();
}
