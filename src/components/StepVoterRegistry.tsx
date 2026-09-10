import React from 'react';

interface StepVoterRegistryProps {
  onProceed: () => void;
}

export const StepVoterRegistry: React.FC<StepVoterRegistryProps> = ({ onProceed }) => {
  return (
    <div className="card">
      <h2 className="card-title">Korak 1: Provera upisa u birački spisak</h2>
      <p className="card-subtitle">
        Pre podnošenja zahteva za glasanje u inostranstvu, neophodno je da proverite da li ste već
        upisani u Jedinstveni birački spisak (JBS) Republike Srbije.
      </p>

      <details className="alert alert-info">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Kako da proverite upis u birački spisak?
        </summary>
        <p style={{ marginTop: '0.5rem' }}>
          Otvorite zvanični portal Ministarstva državne uprave i lokalne samouprave i unesite svoj
          JMBG i broj važeće lične karte ili pasoša.
        </p>
        <div style={{ marginTop: '0.75rem' }}>
          <a
            href="https://upit.birackispisak.gov.rs/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-navy"
          >
            ↗ Otvori proveru biračkog spiska (upit.birackispisak.gov.rs)
          </a>
        </div>
      </details>

      <div style={{ margin: '1.25rem 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          Izaberite svoj status:
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onProceed}
            className="btn btn-primary btn-block"
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '1rem' }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>✓ Upisan/a sam u birački spisak</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Nastavite postupak popunjavanja zahteva za glasanje u inostranstvu
              </div>
            </div>
            <span aria-hidden="true">→</span>
          </button>

          <details style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
            <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary)' }}>
              Šta ako nisam upisan/a u birački spisak?
            </summary>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5, color: '#475569' }}>
              <p>
                Ukoliko niste upisani u Jedinstveni birački spisak (na primer, ako ste punoletstvo
                stekli u inostranstvu ili ranije niste vadili ličnu kartu u Srbiji), neophodno je da
                diplomatsko-konzularnom predstavništvu podnesete <strong>dva zahteva istovremeno</strong>:
              </p>
              <ol style={{ marginLeft: '1.25rem', marginTop: '0.35rem' }}>
                <li>Zahtev za upis u Jedinstveni birački spisak</li>
                <li>Zahtev za upis podatka da ćete glasati u inostranstvu</li>
              </ol>
              <p style={{ marginTop: '0.5rem' }}>
                Ovaj alat popunjava obrazac pod brojem 2. Nakon što popunite ovaj zahtev, možete
                na kontaktima ambasade zatražiti i obrazac za upis u birački spisak.
              </p>
              <button
                type="button"
                onClick={onProceed}
                className="btn btn-sm btn-primary"
                style={{ marginTop: '0.75rem' }}
              >
                Nastavi sa popunjavanjem ovog zahteva →
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
