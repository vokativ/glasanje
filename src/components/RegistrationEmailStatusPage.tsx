import React, { useMemo, useState } from 'react';
import { COUNTRIES, type VotingCountry } from '../data/missions';
import { resolveCurrentElectionContact } from '../lib/electionContact';
import { useScript } from '../lib/script';

export interface ElectionEmailCoverage {
  confirmed: number;
  total: number;
}

export const getElectionEmailCoverage = (
  countries: VotingCountry[] = COUNTRIES,
  now: Date | number = Date.now(),
): ElectionEmailCoverage => {
  const stations = countries.flatMap((country) => country.stations);
  return {
    confirmed: stations.filter(
      (station) => resolveCurrentElectionContact(station, now).electionAuthority !== null,
    ).length,
    total: stations.length,
  };
};

interface RegistrationEmailStatusPageProps {
  now?: number;
  onBack?: () => void;
  onStart?: (countryCode: string) => void;
}

export const RegistrationEmailStatusPage: React.FC<RegistrationEmailStatusPageProps> = ({
  now,
  onBack,
  onStart,
}) => {
  const { script, t } = useScript();
  const [countryCode, setCountryCode] = useState('');
  const coverage = useMemo(() => getElectionEmailCoverage(COUNTRIES, now), [now]);
  const country = useMemo(
    () => COUNTRIES.find((candidate) => candidate.countryCode === countryCode),
    [countryCode],
  );
  return (
    <main>
      <section className="card" aria-labelledby="registration-email-status-title">
        {onBack ? (
          <button
            type="button"
            className="btn btn-sm btn-navy"
            style={{ marginBottom: '1.25rem' }}
            onClick={onBack}
          >
            ← {t('Nazad na prijavu za glasanje')}
          </button>
        ) : (
          <a href="/" className="btn btn-sm btn-navy" style={{ marginBottom: '1.25rem' }}>
            ← {t('Nazad na prijavu za glasanje')}
          </a>
        )}
        <h2 id="registration-email-status-title" className="card-title">
          {t('Status izbornih i-mejl adresa')}
        </h2>
        <p className="card-subtitle">
          {t('Zvanične misije trenutno izričito objavljuju adresu za prijavu za glasanje za ')}
          <strong>{coverage.confirmed}/{coverage.total}</strong>
          {t(' predstavništava.')}
        </p>
        <p className="form-hint">
          {t('Potvrda važi dok traje aktuelno zvanično obaveštenje i povlači se kada ono istekne. Ako za misiju nema potvrde, opšti kontakt nije izborna adresa bez provere zvaničnog obaveštenja.')}
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
            {country.stations.map((station) => {
              const electionContact = resolveCurrentElectionContact(station, now);
              const electionAuthority = electionContact.electionAuthority;
              const isCurrent = electionAuthority !== null;

              return (
                <article
                  key={station.id}
                  className="mission-card"
                  style={{
                    marginBottom: '0.75rem',
                    ...(isCurrent
                      ? {}
                      : {
                          backgroundColor: 'var(--color-error-bg)',
                          borderColor: '#fecaca',
                        }),
                  }}
                >
                  <div className="mission-title">
                    {script === 'cyrillic' ? station.embassyCyr : station.embassy}
                  </div>
                  {!station.isResident && (
                    <span className="mission-coverage-badge">
                      {t('Pokriva ovu državu na nerezidencijalnoj osnovi')}
                    </span>
                  )}
                  {electionAuthority ? (
                    <>
                      <p className="form-hint" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                        {t('✓ Izborna i-mejl adresa je objavljena')}
                      </p>
                      <div className="mission-detail">
                        <strong>{t('Adresa za prijavu:')}</strong>
                        <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                          {electionAuthority.email}
                        </span>
                      </div>
                      <a
                        href={electionAuthority.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                      >
                        {t('Zvanično izborno obaveštenje')} ↗
                      </a>
                    </>
                  ) : (
                    <>
                      <p
                        className="form-hint"
                        style={{ marginTop: '0.5rem', color: 'var(--color-danger)' }}
                      >
                        {t('Trenutno nema potvrđene izborne i-mejl adrese u aktuelnom zvaničnom obaveštenju. Proverite zvanični sajt misije.')}
                      </p>
                      <div className="mission-detail">
                        <strong>{t('Objavljeni opšti kontakt misije:')}</strong>
                        <span>{electionContact.missionEmail}</span>
                      </div>
                    </>
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
              );
            })}
            {onStart ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
                onClick={() => onStart(country.countryCode)}
              >
                {t('Započnite prijavu za ovu državu')} →
              </button>
            ) : (
              <a href={`/?country=${country.countryCode}`} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                {t('Započnite prijavu za ovu državu')} →
              </a>
            )}
          </section>
        )}
      </section>
    </main>
  );
};
