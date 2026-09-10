import React from 'react';

interface HeaderProps {
  onOpenPrivacy: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPrivacy }) => {
  return (
    <header className="header">
      <img
        src="/assets/rotunda-serbica-envelope.webp"
        alt="Rotunda Serbika i koverta"
        className="header-logo"
      />
      <h1 className="header-title">Korak do glasa</h1>
      <p className="header-subtitle">
        Alat za pripremu prijave za glasanje iz inostranstva • Izbori 2026.
      </p>
      <div>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="header-badge"
          title="Kliknite za detalje o privatnosti podataka"
        >
          <span>🔒</span>
          <span>100% na vašem uređaju • Podaci se ne šalju na server</span>
        </button>
      </div>
    </header>
  );
};
