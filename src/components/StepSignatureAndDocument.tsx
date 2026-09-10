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
      setIdDocumentError('Изаберите JPG или PNG слику. Остали формати не могу поуздано да се уграде у PDF.');
      input.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setIdDocumentError('Слика је превелика. Молимо изаберите слику мању од 15 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setIdDocumentError('Слика не може да се прочита на овом уређају. Изаберите другу JPG или PNG слику.');
      input.value = '';
    };
    reader.onload = () => {
      const result = reader.result;
      if (
        typeof result !== 'string' ||
        !/^data:image\/(?:jpeg|png);base64,/.test(result)
      ) {
        setIdDocumentError('Слика није у важећем JPG или PNG формату. Изаберите другу слику.');
        input.value = '';
        return;
      }

      const image = new Image();
      image.onerror = () => {
        setIdDocumentError('Слика не може да се обради. Изаберите другу JPG или PNG слику.');
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
      <h2 className="card-title">Корак 4: Потпис и лични документ</h2>
      <p className="card-subtitle">
        Захтев мора бити потписан према члану 16. Закона о јединственом бирачком списку. Можете се
        потписати директно на екрану или одштампати документ и потписати оловком.
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
              Потпиши на екрану (прстом / мишем, мање корака)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="radio"
                name="sigMode"
                checked={isWetInk}
                onChange={() => setIsWetInk(true)}
              />
              Потписаћу ручно на папиру
            </label>
          </div>

          {!isWetInk ? (
            <div className="signature-wrapper" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <canvas ref={canvasRef} className="signature-canvas" />
              <div className="signature-actions">
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Потпишите се унутар оквира
                </span>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="btn btn-sm btn-outline"
                >
                  Обриши потпис
                </button>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <strong>За ручни потпис вам је неопходан штампач.</strong>
              <ol style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                <li>Преузмите PDF и одштампајте га.</li>
                <li>Својеручно га потпишите хемијском оловком.</li>
                <li>Скенирајте или фотографишите потписан документ.</li>
                <li>Сами га приложите и пошаљите уз поруку ван ове апликације.</li>
              </ol>
              Генерисани PDF са празним пољем за потпис није спреман за слање.{' '}
              <strong>Потпис на екрану је практичнија алтернатива са мање корака.</strong>
            </div>
          )}
        </div>

        {/* Passport / ID Copy Attachment */}
        <div className="form-group" style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <label className="form-label">
            📸 Прилог: Фотографија пасоша или личне карте (опционо)
          </label>
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            Уз захтев је <strong>законски обавезно</strong> доставити копију прве стране важећег српског
            пасоша или обе стране личне карте. Можете је фотографисати камером или изабрати постојећу JPG/PNG
            слику; обрада и спајање у PDF дешавају се искључиво локално у вашем прегледачу.
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
                    Сними камером
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
                    Изаберите постојећу слику
                  </label>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Прихватају се JPG и PNG до 15 MB. Избор камере или датотеке и обрада остају само на вашем уређају.
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
                alt="Преглед документа"
                style={{ height: '70px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                  ✓ Документ је успешно учитан
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Биће аутоматски уграђен као 2. страна у ваш PDF пријаве
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveIdImage}
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--color-error)' }}
              >
                Уклони
              </button>
            </div>
          )}
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            ← Назад
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canProceed}>
            Пређи на преузимање и слање →
          </button>
        </div>
      </form>
    </div>
  );
};
