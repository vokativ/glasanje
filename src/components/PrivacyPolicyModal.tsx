import React from 'react';
import { useScript } from '../lib/script';

// This modal presents the application's privacy and independence disclosures. It is deliberately
// mounted only while open, so hidden dialog controls do not remain in the accessibility tree.

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useScript();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      {/* Backdrop clicks dismiss the dialog; stopping propagation keeps interaction inside it from closing it. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('Polisa privatnosti i bezbednost podataka')}</h2>
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
            <strong>{t('🔒 Vaši podaci nikada ne napuštaju vaš uređaj.')}</strong><br />
            {t(
              'Aplikacija radi 100% lokalno u vašem veb pregledaču. Nijedan podatak (ime, JMBG, adresa, potpis, slika pasoša) se ne šalje na server, niti se čuva u bilo kakvoj bazi podataka.'
            )}
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('1. Kako možete sami da proverite ovu tvrdnju?')}
          </h3>
          <p>{t('Ovo nije samo obećanje — možete sami tehnički proveriti da alat radi potpuno lokalno:')}</p>
          <ol style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>{t('Otvorite ovu stranicu i sačekajte da se učita.')}</li>
            <li>
              <strong>{t('Isključite internet')}</strong>{' '}
              {t('(uključite avion-režim ili isključite Wi-Fi/mrežu).')}
            </li>
            <li>{t('Popunite formular, potpišite se i kliknite na „Preuzmi formular“.')}</li>
            <li>
              {t('Videćete da alat i dalje ')}
              <strong>{t('nesmetano funkcioniše i generiše kompletan PDF')}</strong>!
              {' '}{t('Ovo dokazuje da se sva obrada i izrada dokumenta odvija isključivo na vašem računaru/telefonu.')}
            </li>
          </ol>

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
              <strong>{t('Pravni dokaz:')}</strong>{' '}
              {t('Kada prijavu pošaljete direktno sa svoje lične adrese, u vašoj fascikli ')}
              <em>{t('Sent (Poslato)')}</em>{' '}
              {t('ostaje neosporiv pravni dokaz da ste prijavu blagovremeno uputili nadležnom diplomatsko-konzularnom predstavništvu.')}
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
