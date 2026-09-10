import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApplicationFormData, generateApplicationPdf } from '../lib/pdf';
import {
  canSharePdfFile,
  shareFileWithNativeApp,
  downloadFile,
  copyTextToClipboard,
  getWebmailLinks,
  buildRecipientPayloads,
  isNarrowMobileBrowser,
} from '../lib/share';
import { PollingStation } from '../data/missions';

interface StepExportAndSubmitProps {
  formData: ApplicationFormData;
  station: PollingStation;
  countryName: string;
  isWetInkSignature: boolean;
  onBack: () => void;
  onReset: () => void;
}

export const StepExportAndSubmit: React.FC<StepExportAndSubmitProps> = ({
  formData,
  station,
  countryName,
  isWetInkSignature,
  onBack,
  onReset,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const pdfGenerationRef = useRef<Promise<Uint8Array> | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const mobileSharingAvailable = !isWetInkSignature && canSharePdfFile();
  const hideProviderLinks = isNarrowMobileBrowser();

  const subject = 'Пријава за гласање из иностранства — избори 2026.';
  const isIdDocumentEmbedded = Boolean(formData.idDocumentDataUrl);
  const idDocumentSentence = isIdDocumentEmbedded
    ? 'Копија идентификационог документа уграђена је у PDF.'
    : 'Уз пријаву достављам и копију идентификационог документа.';
  const messageBody = isWetInkSignature
    ? `Поштовани,

Након штампања и својеручног потписивања, у прилогу достављам скенирану или фотографисану пријаву за гласање у иностранству за изборе 2026. године. ${idDocumentSentence}

Држава боравка: ${countryName}
Дипломатско представништво: ${station.embassyCyr}

Молим за потврду пријема захтева.`
    : `Поштовани,

У прилогу достављам попуњен и потписан Захтев за упис у бирачки списак податка да ћу гласати у иностранству на предстојећим изборима 2026. године. ${idDocumentSentence}

Држава боравка: ${countryName}
Дипломатско представништво: ${station.embassyCyr}

Молим за потврду пријема захтева.`;

  const { dispatchInfo, webShareInfo, manualText } = buildRecipientPayloads({
    toEmail: station.email,
    isElectionContactConfirmed: station.isElectionContactConfirmed,
    isIdDocumentEmbedded,
    isWetInkSignature,
    subject,
    body: messageBody,
    fullName: formData.fullName,
  });

  const webmailLinks = getWebmailLinks(dispatchInfo);

  const ensurePdf = useCallback((): Promise<Uint8Array> => {
    if (pdfBytesRef.current) return Promise.resolve(pdfBytesRef.current);
    if (pdfGenerationRef.current) return pdfGenerationRef.current;

    setIsGenerating(true);
    setPdfError(null);
    const generation = generateApplicationPdf(formData)
      .then((generated) => {
        pdfBytesRef.current = generated;
        setPdfBytes(generated);
        return generated;
      })
      .catch((err) => {
        setPdfError(`Грешка при генерисању PDF документа: ${String(err)}`);
        throw err;
      })
      .finally(() => {
        pdfGenerationRef.current = null;
        setIsGenerating(false);
      });

    pdfGenerationRef.current = generation;
    return generation;
  }, [formData]);

  useEffect(() => {
    if (!isWetInkSignature) {
      void ensurePdf().catch(() => undefined);
    }
  }, [ensurePdf, isWetInkSignature]);

  const handleDownload = async () => {
    try {
      const bytes = await ensurePdf();
      downloadFile(bytes, 'Zahtev-za-glasanje-2026.pdf');
      setHasDownloaded(true);
    } catch {
      // The inline PDF error remains visible and this button allows another attempt.
    }
  };

  const handleNativeShare = () => {
    if (!pdfBytes) return;

    setShareError(null);
    const file = new File([pdfBytes.buffer as ArrayBuffer], 'Zahtev-za-glasanje-2026.pdf', {
      type: 'application/pdf',
    });

    void shareFileWithNativeApp(file, webShareInfo).then((result) => {
      if (!result.success && result.error) {
        setShareError(result.error);
      }
    });
  };

  const handleCopyEmail = async () => {
    const success = await copyTextToClipboard(station.email);
    if (success) {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    }
  };

  const handleCopyBody = async () => {
    const success = await copyTextToClipboard(manualText);
    if (success) {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 3000);
    }
  };

  const downloadLabel = isWetInkSignature
    ? '🖨️ Преузми PDF за штампу и потпис →'
    : '📥 Преузми потписан PDF формулар →';

  return (
    <div className="card">
      <h2 className="card-title">Корак 5: Преузимање и предаја пријаве</h2>
      <p className="card-subtitle">
        Преузмите PDF, затим га сами приложите у поруку или га пренесите у изабрану апликацију.
        Ова страница само припрема PDF и не обавља предају.
      </p>

      {!station.isElectionContactConfirmed && (
        <div
          role="alert"
          style={{
            background: 'var(--color-error-bg)',
            border: '2px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontWeight: 700,
            marginBottom: '1.5rem',
            padding: '1rem',
          }}
        >
          <strong>Адреса за изборе није потврђена.</strong> Ово је општи контакт мисије, а не
          потврђено електронско сандуче за упис у бирачки списак. Можете сачекати потврђено
          званично обавештење или сами проверити сајт мисије у одељку за контакт на дну странице.
        </div>
      )}

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          📋 Сажетак пријаве
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          <div><strong>Држава:</strong> {countryName}</div>
          <div><strong>Представништво:</strong> {station.embassyCyr}</div>
          <div>
            <strong>Прилог пасоша:</strong>{' '}
            {formData.idDocumentDataUrl ? 'Уграђен као страна 2 у PDF' : 'Није учитан; приложите га засебно'}
          </div>
        </div>
      </div>


      {isWetInkSignature && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <strong>Потребан је својеручни потпис.</strong> Овај PDF није потписан за слање: одштампајте
          га, потпишите, па направите скен или јасну фотографију. У поруку се ручно прилаже тек
          скенирани/фотографисани потписани образац.
        </div>
      )}

      {mobileSharingAvailable && (
        <section
          aria-labelledby="mobile-handoff-title"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 id="mobile-handoff-title" style={{ marginTop: 0 }}>На телефону: подели PDF (Web Share)</h3>
          <p>
            Отворите дељење и изаберите Gmail, Apple Mail, Outlook или Yahoo Mail да пренесете PDF.
            У изабраној апликацији ручно унесите адресу примаоца према упутству у тексту поруке,
            па уклоните то привремено упутство пре слања.
          </p>
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={isGenerating || !pdfBytes}
            className="btn btn-primary btn-lg btn-block"
          >
            {pdfBytes
              ? '✉️➕📄 Подели PDF у своју апликацију за е-пошту →'
              : isGenerating || !pdfError
                ? '⏳ Припремање PDF-а...'
                : 'PDF није припремљен'}
          </button>
          <p className="form-hint" style={{ textAlign: 'center' }}>
            Дељење преноси PDF и исти наслов и текст поруке, али не уноси примаоца, не додаје
            адресу и не шаље поруку.
          </p>
          {pdfError && (
            <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>
              {pdfError}
            </div>
          )}
          {shareError && (
            <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>
              {shareError}
            </div>
          )}
        </section>
      )}

      <section
        aria-labelledby="desktop-handoff-title"
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 id="desktop-handoff-title" style={{ marginTop: 0 }}>Ручно: преузимање и прилагање PDF-а</h3>
        <p><strong>1.</strong> Преузмите PDF на уређај.</p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="btn btn-secondary btn-lg btn-block"
        >
          {isGenerating ? '⏳ Генерисање PDF-а...' : downloadLabel}
        </button>
        {!mobileSharingAvailable && pdfError && (
          <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>
            {pdfError}
          </div>
        )}
        {hasDownloaded && (
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-success)',
              fontWeight: 600,
              textAlign: 'center',
              marginTop: '0.5rem',
            }}
          >
            {isWetInkSignature
              ? '✓ PDF је преузет. Следе штампање, потпис и скенирање или фотографисање.'
              : '✓ PDF је преузет на ваш уређај.'}
          </div>
        )}

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <p><strong>2.</strong> Отворите припремљену поруку, ручно приложите PDF и сами је пошаљите.</p>
          <a href={webmailLinks.mailto} className="btn btn-primary btn-lg btn-block">
            ✉️ Отвори припремљену е-пошту →
          </a>
          <p className="form-hint">
            Веза отвара подразумевани програм за е-пошту са припремљеним примаоцем, насловом и
            текстом, али не може да приложи PDF нити да пошаље поруку. Ако текст на почетку тражи
            додатни прилог, приложите га, па уклоните то привремено упутство пре слања.
          </p>

          {!hideProviderLinks && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <a href={webmailLinks.gmail} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                Настави у Gmail-у ↗
              </a>
              <a href={webmailLinks.outlook} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                Настави у Outlook-у ↗
              </a>
              <a href={webmailLinks.yahoo} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                Настави у Yahoo-у ↗
              </a>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <p className="form-hint">
              <strong>Потпуно ручна алтернатива:</strong> ако не можете да отворите припремљену
              поруку, копирајте адресу, наслов и текст у своју апликацију за е-пошту. Копирани
              текст почиње привременим упутствима: поступите по њима, па их уклоните пре слања.
            </p>
            <button type="button" onClick={handleCopyBody} className="btn btn-sm btn-outline">
              {copiedBody ? '✓ Адреса, наслов и текст су копирани' : '📝 Копирај адресу, наслов и текст поруке'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <p><strong>3.</strong> Ручно приложите и проверите пре предаје.</p>
          <ul className="checklist">
            <li className="checklist-item">
              <span className="checklist-icon">📎</span>
              <span>
                <strong>Приложите PDF:</strong>{' '}
                {isWetInkSignature
                  ? 'приложите скенирани или фотографисани потписани образац, не непотписани PDF за штампу.'
                  : 'приложите преузети PDF формулар.'}
              </span>
            </li>
            <li className="checklist-item">
              <span className="checklist-icon">📸</span>
              <span>
                <strong>Копија пасоша / личне карте:</strong>{' '}
                {isIdDocumentEmbedded
                  ? 'већ је уграђена као страна 2 PDF-а.'
                  : 'ручно приложите слику прве стране српског пасоша или личне карте.'}
              </span>
            </li>
            <li className="checklist-item">
              <span className="checklist-icon">✓</span>
              <span><strong>Проверите:</strong> адресу примаоца, наслов, прилоге и читљивост потписа пре него што сами предате поруку.</span>
            </li>
          </ul>
        </div>
      </section>
      <div className="hub-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
          ✉️ Јавно објављени контакт мисије/конзулата
        </div>
        <p
          style={{
            color: station.isElectionContactConfirmed ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.9rem',
            fontWeight: 700,
            margin: '0.5rem 0',
          }}
        >
          {station.isElectionContactConfirmed
            ? '✓ Потврђена адреса за изборе 2026.'
            : 'Није потврђена адреса за изборе — ово је само општи контакт мисије.'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0.5rem' }}>
          {station.isElectionContactConfirmed
            ? 'Адреса је преузета из актуелног, одобреног изборног обавештења.'
            : 'Можете сачекати потврђено званично обавештење или сами проверити овај сајт мисије пре предаје.'}
        </p>
        <div className="hub-email-box">
          <span className="hub-email-text">{station.email}</span>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="btn btn-sm btn-outline"
          >
            {copiedEmail ? '✓ Адреса је копирана' : '📋 Копирај адресу примаоца'}
          </button>
        </div>
        <a
          href={station.website}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
          style={{ marginTop: '0.75rem' }}
        >
          🌐 Званични сајт мисије ↗
        </a>
      </div>

      <div className="btn-row">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          ← Назад на преглед података
        </button>
        <button
          type="button"
          onClick={onReset}
          className="btn btn-outline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Започни нову пријаву
        </button>
      </div>
    </div>
  );
};
