import React from 'react';

interface HeaderProps {
  onOpenPrivacy: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPrivacy }) => {
  return (
    <header className="header">
      <img src="/assets/vote-document.svg" alt="Неутрална икона документа за гласање" className="header-logo" />
      <h1 className="header-title">Хоћу да гласам</h1>
      <p className="header-subtitle">
        Алат за припрему пријаве за гласање из иностранства • Избори 2026.
      </p>
      <div>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="header-badge"
          title="Кликните за детаље о приватности података"
        >
          <span>🔒</span>
          <span>100% на вашем уређају • Подаци се не шаљу на сервер</span>
        </button>
      </div>
    </header>
  );
};
