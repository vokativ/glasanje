import React, { useEffect, useRef } from 'react';
import { useScript } from '../lib/script';

// This modal presents the application's privacy and independence disclosures. It is deliberately
// mounted only while open, so hidden dialog controls do not remain in the accessibility tree.

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceStatus?: 'loading' | 'ready' | 'error';
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose, resourceStatus = 'loading' }) => {
  const { t } = useScript();
  const contentRef = useRef<HTMLDivElement>(null);

  // Own the full keyboard lifecycle, including restoration to whichever header
  // or footer control opened the dialog. Query controls on each Tab press so
  // translated or conditionally rendered content cannot leave stale targets.
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const content = contentRef.current;
    const controls = () => Array.from(content.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    controls()[0]?.focus();
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const elements = controls();
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if ((!event.shiftKey && document.activeElement === last) || !content.contains(document.activeElement)) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="privacy-dialog-title">
      {/* Backdrop clicks dismiss the dialog; stopping propagation keeps interaction inside it from closing it. */}
      <div ref={contentRef} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="privacy-dialog-title" className="modal-title">{t('Politika privatnosti i bezbednost podataka')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('Zatvori')}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
          {/* These statements describe the current client-side data-flow boundary; update them with any data-flow change. */}
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <strong>{t('🔒 Obrazac se priprema na vašem uređaju.')}</strong><br />
            {t(
              'Aplikacija ne šalje vaše ime, JMBG, adresu, potpis ili sliku dokumenta na svoj server i ne čuva ih u bazi podataka. Kada sami izaberete kopiranje, deljenje ili otvaranje e-pošte, pripremljeni sadržaj predajete izabranoj aplikaciji ili privremenoj memoriji uređaja.'
            )}
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('1. Internet i lokalna obrada')}
          </h3>
          <p>{t('Čim otvorite aplikaciju, ona u pozadini učitava sve korake i resurse za izradu dokumenta. Kada se priprema završi, možete popuniti prijavu i preuzeti PDF bez interneta dok ova stranica ostaje otvorena. Za otvaranje zvaničnih sajtova, novu stranicu i slanje mejla potreban je internet.')}</p>
          <p role="status" data-resource-status={resourceStatus} style={{ marginTop: '0.5rem' }}>
            {t(resourceStatus === 'ready'
              ? 'Spremno za popunjavanje i preuzimanje PDF-a bez interneta.'
              : resourceStatus === 'loading'
                ? 'Priprema za rad bez interneta je u toku. Ostavite stranicu otvorenu dok se priprema ne završi.'
                : 'Priprema nije završena. Proverite vezu sa internetom; preuzimanje dokumenta će ponovo pokušati učitavanje potrebnih resursa.')}
          </p>
          <p style={{ marginTop: '0.5rem' }}>{t('Podaci prijave ostaju u memoriji otvorene stranice. Osvežavanje stranice ili započinjanje nove prijave ih briše iz aplikacije; već preuzete datoteke i kopirani sadržaj ostaju pod vašom kontrolom.')}</p>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('2. Zašto alat ne šalje mejl automatski umesto vas?')}
          </h3>
          <p>{t('Alat namerno ne koristi server za automatsko slanje mejlova, iz dva ključna razloga:')}</p>
          <ul style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              <strong>{t('Privatnost:')}</strong>{' '}
              {t('Da bi server poslao mejl, morali bismo da primimo vaš JMBG i sliku pasoša na naš server, što odbijamo da radimo.')}
            </li>
            <li>
              <strong>{t('Evidencija slanja:')}</strong>{' '}
              {t('Kada prijavu pošaljete direktno sa svoje lične adrese, u vašoj fascikli ')}
              <em>{t('Sent (Poslato)')}</em>{' '}
              {t('ostaje kopija poruke. Aplikacija ne može da potvrdi slanje ili prijem; potvrdu prijema tražite od predstavništva.')}
            </li>
          </ul>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('3. Otvoreni izvorni kod (Open Source)')}
          </h3>
          <p>
            {t('Kompletan izvorni kod ove aplikacije je javno dostupan svakome na uvid i reviziju. Svako može proveriti tačan kod koji se izvršava u pregledaču.')}
          </p>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('4. Odricanje odgovornosti')}
          </h3>
          <p>
            {t('Ovaj sajt je nezavisna volonterska inicijativa srpske dijaspore i ')}
            <strong>{t('nije zvanični sajt državnih organa Republike Srbije')}</strong>
            {t('. Svrha alata je isključivo olakšavanje popunjavanja zakonom propisanog obrasca i povezivanje sa nadležnom ambasadom ili konzulatom.')}
          </p>

          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button type="button" onClick={onClose} className="btn btn-navy">
              {t('Razumem i slažem se')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
