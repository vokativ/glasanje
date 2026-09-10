import React from 'react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Polisa privatnosti i bezbednost podataka</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            🔒 <strong>Vaši podaci nikada ne napuštaju vaš uređaj.</strong><br />
            Aplikacija radi 100% lokalno u vašem veb pregledaču. Nijedan podatak (ime, JMBG, adresa,
            potpis, slika pasoša) se ne šalje na server, niti se čuva u bilo kakvoj bazi podataka.
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-primary)' }}>
            1. Kako možete sami da proverite ovu tvrdnju?
          </h3>
          <p>
            Ovo nije samo obećanje — možete sami tehnički proveriti da alat radi potpuno lokalno:
          </p>
          <ol style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Otvorite ovu stranicu i sačekajte da se učita.</li>
            <li><strong>Isključite internet</strong> (uključite avion-režim ili isključite Wi-Fi/mrežu).</li>
            <li>Popunite formular, potpišite se i kliknite na „Preuzmi formular“.</li>
            <li>
              Videćete da alat i dalje <strong>nesmetano funkcioniše i generiše kompletan PDF</strong>!
              Ovo dokazuje da se sva obrada i izrada dokumenta odvija isključivo na vašem računaru/telefonu.
            </li>
          </ol>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            2. Zašto alat ne šalje mejl automatski umesto vas?
          </h3>
          <p>
            Alat namerno ne koristi server za automatsko slanje mejlova, iz dva ključna razloga:
          </p>
          <ul style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              <strong>Privatnost:</strong> Da bi server poslao mejl, morali bismo da primimo vaš JMBG i sliku
              pasoša na naš server, što odbijamo da radimo.
            </li>
            <li>
              <strong>Pravni dokaz:</strong> Kada prijavu pošaljete direktno sa svoje lične adrese, u vašoj
              fascikli <em>Sent (Poslato)</em> ostaje neosporiv pravni dokaz da ste prijavu blagovremeno uputili
              nadležnom diplomatsko-konzularnom predstavništvu.
            </li>
          </ul>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            3. Otvoreni izvorni kod (Open Source)
          </h3>
          <p>
            Kompletan izvorni kod ove aplikacije je javno dostupan svakome na uvid i reviziju.
            Svako može proveriti tačan kod koji se izvršava u pregledaču.
          </p>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            4. Odricanje odgovornosti
          </h3>
          <p>
            Ovaj sajt je nezavisna volonterska inicijativa srpske dijaspore i <strong>nije zvanični sajt
            državnih organa Republike Srbije</strong>. Svrha alata je isključivo olakšavanje popunjavanja zakonom
            propisanog obrasca i povezivanje sa nadležnom ambasadom ili konzulatom.
          </p>

          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button type="button" onClick={onClose} className="btn btn-navy">
              Razumem i slažem se
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
