
export interface ApplicationFormData {
  fullName: string;
  placeOfBirth: string;
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

const TEMPLATE_URL = '/assets/Zahtev-za-glasanje-u-inostranstvu-2022.pdf';
const FONT_URL = '/assets/Roboto-Regular.ttf';

let cachedTemplateBytes: ArrayBuffer | null = null;
let cachedFontBytes: ArrayBuffer | null = null;

async function loadAssets(): Promise<{ template: ArrayBuffer; font: ArrayBuffer }> {
  if (cachedTemplateBytes && cachedFontBytes) {
    return { template: cachedTemplateBytes, font: cachedFontBytes };
  }

  const [tplRes, fontRes] = await Promise.all([
    fetch(TEMPLATE_URL),
    fetch(FONT_URL),
  ]);

  if (!tplRes.ok) throw new Error(`Неуспешно учитавање PDF шаблона: ${tplRes.statusText}`);
  if (!fontRes.ok) throw new Error(`Неуспешно учитавање фонта: ${fontRes.statusText}`);

  cachedTemplateBytes = await tplRes.arrayBuffer();
  cachedFontBytes = await fontRes.arrayBuffer();

  return { template: cachedTemplateBytes, font: cachedFontBytes };
}


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


  // 1. Име и презиме
  writeWrappedText(page1, data.fullName, 285, 640, robotoFont, 10, 270);

  // 2. Место рођења
  writeWrappedText(page1, data.placeOfBirth, 285, 610, robotoFont, 10, 270);

  // 3. ЈМБГ (13 цифара исписаних са фиксним кораком)
  const jmbgDigits = data.jmbg.replace(/\D/g, '').split('');
  let jmbgX = 290;
  for (const digit of jmbgDigits) {
    page1.drawText(digit, {
      x: jmbgX,
      y: 550,
      size: 10,
      font: robotoFont,
      color: rgb(0, 0, 0),
    });
    jmbgX += 18;
  }

  // 4. Адреса пребивалишта у Р. Србији
  writeWrappedText(page1, data.serbianAddress, 290, 500, robotoFont, 9, 270, 12);

  // 5. Адреса боравка у иностранству
  writeWrappedText(page1, data.foreignAddress, 290, 460, robotoFont, 9, 270, 12);

  // 6. Град, држава - где желим да гласам у иностранству
  const votingTarget = data.desiredLocation
    ? `${data.desiredLocation} (${data.stationName})`
    : data.stationName;
  writeWrappedText(page1, votingTarget, 290, 425, robotoFont, 9, 270, 12);

  // Датум
  page1.drawText(data.signingDate, {
    x: 140,
    y: 320,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

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
        x: 350,
        y: 280,
        width: w,
        height: h,
      });
    } catch (err) {
      console.warn('Грешка при уметању потписа у PDF:', err);
    }
  }

  // Контакт телефон
  page1.drawText(data.phone, {
    x: 340,
    y: 240,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

  // И-мејл
  page1.drawText(data.email, {
    x: 340,
    y: 185,
    size: 10,
    font: robotoFont,
    color: rgb(0, 0, 0),
  });

  // Опциона страна 2: Копија пасоша / личне карте
  if (data.idDocumentDataUrl) {
    const isPng = data.idDocumentDataUrl.startsWith('data:image/png;base64,');
    const isJpeg = data.idDocumentDataUrl.startsWith('data:image/jpeg;base64,');
    if (!isPng && !isJpeg) {
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
