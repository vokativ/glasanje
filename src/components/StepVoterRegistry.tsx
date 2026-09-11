import React from 'react';
import { useScript } from '../lib/script';

// This step explains the prerequisite but does not inspect the voter registry. The official lookup
// runs on its separate site; choosing a status here only advances the local form flow.

interface StepVoterRegistryProps {
  onProceed: () => void;
}

export const StepVoterRegistry: React.FC<StepVoterRegistryProps> = ({ onProceed }) => {
  const { t } = useScript();

  return (
    <div className="card">
      <h2 className="card-title">{t('Korak 1: Provera upisa u birački spisak')}</h2>
      <p className="card-subtitle">
        {t('Pre podnošenja zahteva za glasanje u inostranstvu, neophodno je da proverite da li ste već upisani u Jedinstveni birački spisak (JBS) Republike Srbije.')}
      </p>

      <details className="alert alert-info">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t('Kako da proverite upis u birački spisak?')}
        </summary>
        <p style={{ marginTop: '0.5rem' }}>
          {t('Otvorite zvanični portal Ministarstva državne uprave i lokalne samouprave i unesite svoj JMBG i broj važeće lične karte ili pasoša.')}
        </p>
        <div style={{ marginTop: '0.75rem' }}>
          {/* The registry lookup is external; opening it separately avoids transferring identity details through this app. */}
          <a
            href="https://upit.birackispisak.gov.rs/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-navy"
          >
            ↗ {t('Otvori proveru biračkog spiska')} (upit.birackispisak.gov.rs)
          </a>
        </div>
      </details>

      <div style={{ margin: '1.25rem 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          {t('Izaberite svoj status:')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onProceed}
            className="btn btn-primary btn-block"
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '1rem' }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>✓ {t('Upisan/a sam u birački spisak')}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {t('Nastavite postupak popunjavanja zahteva za glasanje u inostranstvu')}
              </div>
            </div>
            <span aria-hidden="true">→</span>
          </button>

          <details style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
            <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary)' }}>
              {t('Šta ako nisam upisan/a u birački spisak?')}
            </summary>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5, color: '#475569' }}>
              <p>
                {t('Ukoliko niste upisani u Jedinstveni birački spisak (na primer, ako ste punoletstvo stekli u inostranstvu ili ranije niste vadili ličnu kartu u Srbiji), neophodno je da diplomatsko-konzularnom predstavništvu podnesete ')}
                <strong>{t('dva zahteva istovremeno')}</strong>:
              </p>
              <ol style={{ marginLeft: '1.25rem', marginTop: '0.35rem' }}>
                <li>{t('Zahtev za upis u Jedinstveni birački spisak')}</li>
                <li>{t('Zahtev za upis podatka da ćete glasati u inostranstvu')}</li>
              </ol>
              <p style={{ marginTop: '0.5rem' }}>
                {t('Ovaj alat popunjava obrazac pod brojem 2. Nakon što popunite ovaj zahtev, možete na kontaktima ambasade zatražiti i obrazac za upis u birački spisak.')}
              </p>
              <button
                type="button"
                onClick={onProceed}
                className="btn btn-sm btn-primary"
                style={{ marginTop: '0.75rem' }}
              >
                {t('Nastavi sa popunjavanjem ovog zahteva')} →
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
