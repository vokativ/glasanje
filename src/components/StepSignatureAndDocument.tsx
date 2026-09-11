import React, { useRef, useEffect, useState } from 'react';
import { useScript } from '../lib/script';
import SignaturePad from 'signature_pad';

export interface SignatureAndDocumentData {
  signaturePngDataUrl: string;
  isWetInkSignature: boolean;
}

interface StepSignatureAndDocumentProps {
  initialData?: Partial<SignatureAndDocumentData>;
  idDocumentDataUrl?: string;
  onIdDocumentChange: (dataUrl: string | undefined) => void;
  onBack: () => void;
  onNext: (data: SignatureAndDocumentData) => void;
}

export const canSubmitSignature = (isWetInk: boolean, pad: SignaturePad | null): boolean =>
  isWetInk || Boolean(pad && !pad.isEmpty());


export const StepSignatureAndDocument: React.FC<StepSignatureAndDocumentProps> = ({
  initialData,
  idDocumentDataUrl,
  onIdDocumentChange,
  onBack,
  onNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const idImageSelectionRef = useRef(0);
  const isMountedRef = useRef(true);

  const [isWetInk, setIsWetInk] = useState<boolean>(initialData?.isWetInkSignature || false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isReadingIdImage, setIsReadingIdImage] = useState(false);
  const [idDocumentError, setIdDocumentError] = useState<string | null>(null);
  const { t } = useScript();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      idImageSelectionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || isWetInk) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    const pad = new SignaturePad(canvas, {
      minWidth: 1.2,
      maxWidth: 3.5,
      penColor: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0)',
    });

    const updateHasSignature = () => {
      setHasSignature(!pad.isEmpty());
    };

    pad.addEventListener('afterUpdateStroke', updateHasSignature);
    pad.addEventListener('endStroke', updateHasSignature);

    signaturePadRef.current = pad;
    setHasSignature(!pad.isEmpty());

    return () => {
      if (signaturePadRef.current === pad) {
        signaturePadRef.current = null;
      }
      pad.off();
    };
  }, [isWetInk]);

  const handleClearSignature = () => {
    const pad = signaturePadRef.current;
    if (!pad) return;

    pad.clear();
    setHasSignature(!pad.isEmpty());
  };

  const handleIdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const selection = idImageSelectionRef.current + 1;
    idImageSelectionRef.current = selection;
    const isCurrentSelection = () =>
      isMountedRef.current && idImageSelectionRef.current === selection;
    const rejectSelection = (message: string) => {
      if (!isCurrentSelection()) return;
      setIdDocumentError(message);
      setIsReadingIdImage(false);
      input.value = '';
    };

    const supportedTypes = ['image/jpeg', 'image/png'];
    if (!supportedTypes.includes(file.type)) {
      rejectSelection(
        'Izaberite JPG ili PNG sliku. Ostali formati ne mogu pouzdano da se ugrade u PDF.'
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      rejectSelection('Slika je prevelika. Molimo izaberite sliku manju od 15 MB.');
      return;
    }

    setIdDocumentError(null);
    setIsReadingIdImage(true);
    const reader = new FileReader();
    reader.onerror = () => {
      rejectSelection(
        'Slika ne može da se pročita na ovom uređaju. Izaberite drugu JPG ili PNG sliku.'
      );
    };
    reader.onload = () => {
      if (!isCurrentSelection()) return;

      const result = reader.result;
      if (
        typeof result !== 'string' ||
        !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(result)
      ) {
        rejectSelection('Slika nije u važećem JPG ili PNG formatu. Izaberite drugu sliku.');
        return;
      }

      const image = new Image();
      image.onerror = () => {
        rejectSelection('Slika ne može da se obradi. Izaberite drugu JPG ili PNG sliku.');
      };
      image.onload = () => {
        if (!isCurrentSelection()) return;
        onIdDocumentChange(result);
        setIdDocumentError(null);
        setIsReadingIdImage(false);
        input.value = '';
      };
      image.src = result;
    };

    try {
      reader.readAsDataURL(file);
    } catch {
      rejectSelection(
        'Slika ne može da se pročita na ovom uređaju. Izaberite drugu JPG ili PNG sliku.'
      );
    }
  };

  const handleRemoveIdImage = () => {
    idImageSelectionRef.current += 1;
    setIsReadingIdImage(false);
    onIdDocumentChange(undefined);
    setIdDocumentError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadingIdImage) return;

    const pad = signaturePadRef.current;
    if (!canSubmitSignature(isWetInk, pad)) {
      setHasSignature(false);
      return;
    }
    const signaturePng = isWetInk ? '' : pad!.toDataURL('image/png');

    onNext({
      signaturePngDataUrl: signaturePng,
      isWetInkSignature: isWetInk,
    });
  };

  const canProceed = (isWetInk || hasSignature) && !isReadingIdImage;

  return (
    <div className="card">
      <h2 className="card-title">{t('Korak 4: Potpis i lični dokument')}</h2>
      <p className="card-subtitle">
        {t(
          'Zahtev mora biti potpisan prema članu 16. Zakona o jedinstvenom biračkom spisku. Možete se potpisati direktno na ekranu ili odštampati dokument i potpisati olovkom.'
        )}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Signature Options */}
        <div className="form-group">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="radio"
                name="sigMode"
                checked={!isWetInk}
                onChange={() => setIsWetInk(false)}
              />
              {t('Potpiši na ekranu (prstom / mišem, manje koraka)')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="radio"
                name="sigMode"
                checked={isWetInk}
                onChange={() => setIsWetInk(true)}
              />
              {t('Potpisaću ručno na papiru')}
            </label>
          </div>

          {!isWetInk ? (
            <div className="signature-wrapper" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <canvas ref={canvasRef} className="signature-canvas" />
              <div className="signature-actions">
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {t('Potpišite se unutar okvira')}
                </span>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="btn btn-sm btn-outline"
                >
                  {t('Obriši potpis')}
                </button>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <strong>{t('Za ručni potpis vam je neophodan štampač.')}</strong>
              <ol style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                <li>{t('Preuzmite PDF i odštampajte ga.')}</li>
                <li>{t('Svojeručno ga potpišite hemijskom olovkom.')}</li>
                <li>{t('Skenirajte ili fotografišite potpisan dokument.')}</li>
                <li>{t('Sami ga priložite i pošaljite uz poruku van ove aplikacije.')}</li>
              </ol>
              {t('Generisani PDF sa praznim poljem za potpis nije spreman za slanje. ')}
              <strong>{t('Potpis na ekranu je praktičnija alternativa sa manje koraka.')}</strong>
            </div>
          )}
        </div>

        {/* Passport / ID Copy Attachment */}
        <div className="form-group" style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <label className="form-label">
            {t('📸 Prilog: Fotografija pasoša ili lične karte (opciono)')}
          </label>
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            {t('Uz zahtev je ')}<strong>{t('zakonski obavezno')}</strong>{' '}
            {t(
              'dostaviti kopiju prve strane važećeg srpskog pasoša ili obe strane lične karte. Možete je fotografisati kamerom ili izabrati postojeću JPG/PNG sliku; obrada i spajanje u PDF dešavaju se isključivo lokalno u vašem pregledaču.'
            )}
          </p>

          {!idDocumentDataUrl ? (
            <div style={{ padding: '1rem', border: '2px dashed #cbd5e1', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                <div className="file-input-option">
                  <input
                    type="file"
                    id="idImageCameraInput"
                    name="idDocumentCamera"
                    autoComplete="off"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    onChange={handleIdImageUpload}
                    disabled={isReadingIdImage}
                    className="file-input-visually-hidden"
                  />
                  <label
                    htmlFor="idImageCameraInput"
                    className="btn btn-secondary file-input-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    {t('Snimi kamerom')}
                  </label>
                </div>
                <div className="file-input-option">
                  <input
                    type="file"
                    id="idImageInput"
                    name="idDocumentFile"
                    autoComplete="off"
                    accept="image/jpeg,image/png"
                    onChange={handleIdImageUpload}
                    disabled={isReadingIdImage}
                    className="file-input-visually-hidden"
                  />
                  <label
                    htmlFor="idImageInput"
                    className="btn btn-outline file-input-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    {t('Izaberite postojeću sliku')}
                  </label>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                {t(
                  'Prihvataju se JPG i PNG do 15 MB. Izbor kamere ili datoteke i obrada ostaju samo na vašem uređaju.'
                )}
              </div>
              {isReadingIdImage && (
                <div role="status" aria-live="polite" className="form-hint" style={{ marginTop: '0.75rem' }}>
                  {t('Provera i obrada slike dokumenta…')}
                </div>
              )}
              {idDocumentError && (
                <div className="form-error" role="alert" style={{ marginTop: '0.75rem' }}>
                  {t(idDocumentError)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
              <img
                src={idDocumentDataUrl}
                alt={t('Pregled dokumenta')}
                style={{ height: '70px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                  {t('✓ Dokument je uspešno učitan')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {t('Biće automatski ugrađen kao 2. strana u vaš PDF prijave')}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveIdImage}
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--color-error)' }}
              >
                {t('Ukloni')}
              </button>
            </div>
          )}
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            {t('← Nazad')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canProceed}>
            {t('Pređi na preuzimanje i slanje →')}
          </button>
        </div>
      </form>
    </div>
  );
};
