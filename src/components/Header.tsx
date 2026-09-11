import React from 'react';
import { useScript } from '../lib/script';

// The header owns only global presentation controls: script selection and the request to show the
// privacy disclosure. Data handling remains the responsibility of the features that collect it.

interface HeaderProps {
  onOpenPrivacy: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPrivacy }) => {
  const { script, setScript, t } = useScript();

  return (
    <header className="header">
      <img
        src="/assets/rotunda-serbica-envelope.webp"
        alt={t('Rotunda Serbika i koverta')}
        className="header-logo"
      />
      <h1 className="header-title">{t('Korak do glasa')}</h1>
      <p className="header-subtitle">
        {t('Alat za pripremu prijave za glasanje iz inostranstva • Izbori 2026.')}
      </p>
      <div
        role="group"
        aria-label={t('Pismo interfejsa')}
        style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
      >
        <button
          type="button"
          onClick={() => setScript('cyrillic')}
          aria-pressed={script === 'cyrillic'}
        >
          {t('Ćirilica')}
        </button>
        <button
          type="button"
          onClick={() => setScript('latin')}
          aria-pressed={script === 'latin'}
        >
          {t('Latinica')}
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="header-badge"
          title={t('Kliknite za detalje o privatnosti podataka')}
        >
          <span>🔒</span>
          <span>{t('100% na vašem uređaju • Podaci se ne šalju na server')}</span>
        </button>
      </div>
    </header>
  );
};
