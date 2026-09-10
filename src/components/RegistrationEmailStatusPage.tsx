import React, { useMemo, useState } from 'react';
import { COUNTRIES, type VotingCountry } from '../data/missions';
import { useScript } from '../lib/script';

export interface ElectionEmailCoverage {
  confirmed: number;
  total: number;
}

export const getElectionEmailCoverage = (
  countries: VotingCountry[] = COUNTRIES,
): ElectionEmailCoverage => {
  const stations = countries.flatMap((country) => country.stations);
  return {
    confirmed: stations.filter((station) => station.isElectionContactConfirmed).length,
    total: stations.length,
  };
};

export const RegistrationEmailStatusPage: React.FC = () => {
  const { script, t } = useScript();
  const [countryCode, setCountryCode] = useState('');
  const coverage = useMemo(() => getElectionEmailCoverage(), []);
  const country = useMemo(
    () => COUNTRIES.find((candidate) => candidate.countryCode === countryCode),
    [countryCode],
  );

  return (
    <main>
      <section className="card" aria-labelledby="registration-email-status-title">
        <a href="/" className="btn btn-sm btn-navy" style={{ marginBottom: '1.25rem' }}>
          ← {t('Nazad na prijavu za glasanje')}
        </a>
        <h2 id="registration-email-status-title" className="card-title">
          {t('Status izbornih i-mejl adresa')}
        </h2>
        <p className="card-subtitle">
          {t('Zvanične misije su do sada izričito objavile adresu za prijavu za glasanje za ')}
          <strong>{coverage.confirmed}/{coverage.total}</strong>
          {t(' predstavništava.')}
        </p>
        <p className="form-hint">
          {t('Status znači da je aktuelno zvanično izborno obaveštenje navelo adresu. Ako za misiju nema potvrde, ne koristite opšti kontakt kao izbornu adresu bez provere zvaničnog obaveštenja.')}
        </p>

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label" htmlFor="statusCountrySelect">
            {t('Država boravka')}
          </label>
          <select
            id="statusCountrySelect"
            name="statusCountrySelect"
            className="form-control"
            value={countryCode}
            onChange={(event) => setCountryCode(event.currentTarget.value)}
          >
            <option value="">{t('Izaberite državu boravka…')}</option>
            {COUNTRIES.map((candidate) => (
              <option key={candidate.countryCode} value={candidate.countryCode}>
                {script === 'cyrillic' ? candidate.labelCyr : candidate.label}
              </option>
            ))}
          </select>
        </div>

        {country && (
          <section aria-live="polite" aria-label={t('Status predstavništava za izabranu državu')}>
            <h3 style={{ fontSize: '1rem', margin: '1.25rem 0 0.75rem' }}>
              {script === 'cyrillic' ? country.labelCyr : country.label}
            </h3>
            {country.stations.map((station) => (
              <article key={station.id} className="mission-card" style={{ marginBottom: '0.75rem' }}>
                <div className="mission-title">
                  {script === 'cyrillic' ? station.embassyCyr : station.embassy}
                </div>
                {!station.isResident && (
                  <span className="mission-coverage-badge">
                    {t('Pokriva ovu državu na nerezidencijalnoj osnovi')}
                  </span>
                )}
                {station.isElectionContactConfirmed ? (
                  <>
                    <p className="form-hint" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                      {t('✓ Izborna i-mejl adresa je objavljena')}
                    </p>
                    <div className="mission-detail">
                      <strong>{t('Adresa za prijavu:')}</strong>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{station.email}</span>
                    </div>
                  </>
                ) : (
                  <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                    {t('Izborna i-mejl adresa još nije potvrđena u aktuelnom zvaničnom obaveštenju.')}
                  </p>
                )}
                {station.website && (
                  <a
                    href={station.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                  >
                    {t('Zvanični sajt misije')} ↗
                  </a>
                )}
              </article>
            ))}
            <a href={`/?country=${country.countryCode}`} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              {t('Započnite prijavu za ovu državu')} →
            </a>
          </section>
        )}
      </section>
    </main>
  );
};
