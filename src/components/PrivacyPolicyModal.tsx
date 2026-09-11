import React from 'react';
import { useScript } from '../lib/script';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useScript();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
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
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <strong>{t('🔒 Podaci koje unesete ostaju u vašem pregledaču.')}</strong><br />
            {t(
              'Ime, ime roditelja, JMBG, adresa, potpis i slika dokumenta koriste se samo da bi se na vašem uređaju napravio PDF. Ovaj sajt nema bazu podataka i ne šalje prijavu umesto vas.'
            )}
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('1. Kako možete sami da proverite ovu tvrdnju?')}
          </h3>
          <p>{t('Ne morate da verujete na reč — proveru možete uraditi sami:')}</p>
          <ol style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>{t('Popunite korake do kraja i preuzmite PDF.')}</li>
            <li>
              <strong>{t('Isključite internet')}</strong>{' '}
              {t('(avion-režim ili isključena mreža).')}
            </li>
            <li>{t('Vratite se korak nazad, izmenite neki podatak i ponovo preuzmite PDF.')}</li>
            <li>
              {t('Novi PDF se pravi i ')}
              <strong>{t('bez interneta')}</strong>
              {t('. To znači da se priprema dokumenta odvija na vašem uređaju.')}
            </li>
          </ol>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('2. Zašto alat ne šalje mejl automatski umesto vas?')}
          </h3>
          <p>{t('Alat nema server koji šalje mejlove umesto vas. To je namerno, iz dva razloga:')}</p>
          <ul style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              <strong>{t('Privatnost:')}</strong>{' '}
              {t('Slanje sa servera bi značilo da vaš JMBG i slika dokumenta prvo stignu kod nas. To ne radimo.')}
            </li>
            <li>
              <strong>{t('Vaša evidencija:')}</strong>{' '}
              {t('Poruku šaljete sa svoje adrese, pa vam ostaje u fascikli poslatih poruka, sa datumom i prilozima. Potvrdu prijema tražite od predstavništva.')}
            </li>
          </ul>
          <p>{t('Kada sami izaberete deljenje ili svoju aplikaciju za e-poštu, PDF i tekst poruke prelaze u tu aplikaciju. Slanje i dalje pokrećete vi.')}</p>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            {t('3. Otvoreni izvorni kod')}
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
