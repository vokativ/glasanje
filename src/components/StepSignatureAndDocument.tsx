import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

export interface SignatureAndDocumentData {
  signaturePngDataUrl: string;
  isWetInkSignature: boolean;
  idDocumentDataUrl?: string;
}

interface StepSignatureAndDocumentProps {
  initialData?: Partial<SignatureAndDocumentData>;
  onBack: () => void;
  onNext: (data: SignatureAndDocumentData) => void;
}

export const canSubmitSignature = (isWetInk: boolean, pad: SignaturePad | null): boolean =>
  isWetInk || Boolean(pad && !pad.isEmpty());


export const StepSignatureAndDocument: React.FC<StepSignatureAndDocumentProps> = ({
  initialData,
  onBack,
  onNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const [isWetInk, setIsWetInk] = useState<boolean>(initialData?.isWetInkSignature || false);
  const [hasSignature, setHasSignature] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | undefined>(
    initialData?.idDocumentDataUrl
  );
  const [idDocumentError, setIdDocumentError] = useState<string | null>(null);

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

    const supportedTypes = ['image/jpeg', 'image/png'];
    if (!supportedTypes.includes(file.type)) {
      setIdDocumentError('Izaberite JPG ili PNG sliku. Ostali formati ne mogu pouzdano da se ugrade u PDF.');
      input.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setIdDocumentError('Slika je prevelika. Molimo izaberite sliku manju od 15 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setIdDocumentError('Slika ne može da se pročita na ovom uređaju. Izaberite drugu JPG ili PNG sliku.');
      input.value = '';
    };
    reader.onload = () => {
      const result = reader.result;
      if (
        typeof result !== 'string' ||
        !/^data:image\/(?:jpeg|png);base64,/.test(result)
      ) {
        setIdDocumentError('Slika nije u važećem JPG ili PNG formatu. Izaberite drugu sliku.');
        input.value = '';
        return;
      }

      const image = new Image();
      image.onerror = () => {
        setIdDocumentError('Slika ne može da se obradi. Izaberite drugu JPG ili PNG sliku.');
        input.value = '';
      };
      image.onload = () => {
        setIdDocumentUrl(result);
        setIdDocumentError(null);
      };
      image.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIdImage = () => {
    setIdDocumentUrl(undefined);
    setIdDocumentError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pad = signaturePadRef.current;
    if (!canSubmitSignature(isWetInk, pad)) {
      setHasSignature(false);
      return;
    }
    const signaturePng = isWetInk ? '' : pad!.toDataURL('image/png');

    onNext({
      signaturePngDataUrl: signaturePng,
      isWetInkSignature: isWetInk,
      idDocumentDataUrl: idDocumentUrl,
    });
  };

  const canProceed = isWetInk || hasSignature;

  return (
    <div className="card">
      <h2 className="card-title">Korak 4: Potpis i lični dokument</h2>
      <p className="card-subtitle">
        Zahtev mora biti potpisan prema članu 16. Zakona o jedinstvenom biračkom spisku. Možete se
        potpisati direktno na ekranu ili odštampati dokument i potpisati olovkom.
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
              Potpiši na ekranu (prstom / mišem, manje koraka)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="radio"
                name="sigMode"
                checked={isWetInk}
                onChange={() => setIsWetInk(true)}
              />
              Potpisaću ručno na papiru
            </label>
          </div>

          {!isWetInk ? (
            <div className="signature-wrapper" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <canvas ref={canvasRef} className="signature-canvas" />
              <div className="signature-actions">
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Potpišite se unutar okvira
                </span>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="btn btn-sm btn-outline"
                >
                  Obriši potpis
                </button>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <strong>Za ručni potpis vam je neophodan štampač.</strong>
              <ol style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                <li>Preuzmite PDF i odštampajte ga.</li>
                <li>Svojeručno ga potpišite hemijskom olovkom.</li>
                <li>Skenirajte ili fotografišite potpisan dokument.</li>
                <li>Sami ga priložite i pošaljite uz poruku van ove aplikacije.</li>
              </ol>
              Generisani PDF sa praznim poljem za potpis nije spreman za slanje.{' '}
              <strong>Potpis na ekranu je praktičnija alternativa sa manje koraka.</strong>
            </div>
          )}
        </div>

        {/* Passport / ID Copy Attachment */}
        <div className="form-group" style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <label className="form-label">
            📸 Prilog: Fotografija pasoša ili lične karte (opciono)
          </label>
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            Uz zahtev je <strong>zakonski obavezno</strong> dostaviti kopiju prve strane važećeg srpskog
            pasoša ili obe strane lične karte. Možete je fotografisati kamerom ili izabrati postojeću JPG/PNG
            sliku; obrada i spajanje u PDF dešavaju se isključivo lokalno u vašem pregledaču.
          </p>

          {!idDocumentUrl ? (
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
                    className="file-input-visually-hidden"
                  />
                  <label
                    htmlFor="idImageCameraInput"
                    className="btn btn-secondary file-input-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    Snimi kamerom
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
                    className="file-input-visually-hidden"
                  />
                  <label
                    htmlFor="idImageInput"
                    className="btn btn-outline file-input-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    Izaberite postojeću sliku
                  </label>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Prihvataju se JPG i PNG do 15 MB. Izbor kamere ili datoteke i obrada ostaju samo na vašem uređaju.
              </div>
              {idDocumentError && (
                <div className="form-error" role="alert" style={{ marginTop: '0.75rem' }}>
                  {idDocumentError}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
              <img
                src={idDocumentUrl}
                alt="Pregled dokumenta"
                style={{ height: '70px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                  ✓ Dokument je uspešno učitan
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Biće automatski ugrađen kao 2. strana u vaš PDF prijave
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveIdImage}
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--color-error)' }}
              >
                Ukloni
              </button>
            </div>
          )}
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            ← Nazad
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canProceed}>
            Pređi na preuzimanje i slanje →
          </button>
        </div>
      </form>
    </div>
  );
};
