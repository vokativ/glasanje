import React, { useMemo } from 'react';
import { COUNTRIES, type VotingCountry } from '../data/missions';
import { useScript, type Script } from '../lib/script';
import { ElectionNoticeLink } from './ElectionNoticeLink';
import { MissionInquiryLink } from './MissionInquiryLink';
import { CountryFlag } from './CountryFlag';

/**
 * Public, searchable inventory of country/mission approval, using generated data
 * only. Each non-resident station already carries its resolved recipient; this
 * view must not infer jurisdiction or deduplicate separate consulates by email.
 * Partial counts approved station records, never geographic coverage or whether
 * a polling place will open. See docs/architecture.md for the UI/data contract.
 */
export interface ElectionEmailCoverage {
  approved: number;
  total: number;
}

export const getElectionEmailCoverage = (
  countries: VotingCountry[] = COUNTRIES,
): ElectionEmailCoverage => {
  const stations = countries.flatMap((country) => country.stations);
  return {
    approved: stations.filter(
      (station) => station.electionContactApproval !== 'unconfirmed',
    ).length,
    total: stations.length,
  };
};

export const groupCoverageCountries = (script: Script, countries: VotingCountry[] = COUNTRIES) => {
  const name = (country: VotingCountry) => script === 'latin' ? country.label : country.labelCyr;
  const collator = new Intl.Collator(script === 'latin' ? 'sr-Latn' : 'sr-Cyrl');
  const groups: { letter: string; countries: VotingCountry[] }[] = [];
  for (const country of [...countries].sort((a, b) => collator.compare(name(a), name(b)))) {
    const label = name(country);
    // Serbian Latin digraphs are single alphabet letters.
    const letter = script === 'latin' ? label.match(/^(Dž|Lj|Nj|.)/u)![0] : label[0];
    const previous = groups[groups.length - 1];
    if (previous?.letter === letter) previous.countries.push(country);
    else groups.push({ letter, countries: [country] });
  }
  return groups;
};

export const RegistrationEmailStatusPage: React.FC = () => {
  const { script, t } = useScript();
  const coverage = useMemo(() => getElectionEmailCoverage(), []);
  const groups = useMemo(() => groupCoverageCountries(script), [script]);

  return (
    <main>
      <section className="card" aria-labelledby="registration-email-status-title">
        <a href={script === 'latin' ? '/?script=latin' : '/'} className="btn btn-sm btn-navy" style={{ marginBottom: '1.25rem' }}>
          ← {t('Nazad na prijavu za glasanje')}
        </a>
        <h2 id="registration-email-status-title" className="card-title">
          {t('Potvrđene izborne i-mejl adrese')}
        </h2>
        <p className="card-subtitle">
          {t('Misije imaju potvrđenu adresu za prijavu za glasanje za ')}
          <strong>{coverage.approved}/{coverage.total}</strong>
          {t(' predstavništava.')}
        </p>
        <p className="form-hint">
          {t('Status označava potvrđenu adresu za prijavu u ovom alatu, ne otvaranje biračkog mesta. Otvorite državu za kontakte, zvanična obaveštenja i prijavu.')}
        </p>
        <div className="coverage-legend">
          <span className="coverage-status coverage-status--confirmed">✓ {t('Sve adrese potvrđene')}</span>
          <span className="coverage-status coverage-status--partial">◐ {t('Deo adresa potvrđen')}</span>
          <span className="coverage-status coverage-status--unconfirmed">✕ {t('Bez potvrđene adrese')}</span>
        </div>
        <p className="form-hint" style={{ marginTop: '0.5rem' }}>
          {t('Delimično znači da neka predstavništva imaju potvrđenu adresu, a druga još nemaju. Broj pokazuje koliko ih je potvrđeno od ukupnog broja — ne koliki deo države je pokriven.')}
        </p>
        {/* Include /status explicitly: the document's base URL is /, so a bare
            fragment would navigate to the form. Preserve script on every link. */}
        <nav className="coverage-alphabet" aria-label={t('Države po početnom slovu')}>
          {groups.map(group => (
            <a key={group.letter} href={`/status${script === 'latin' ? '?script=latin' : ''}#coverage-letter-${group.countries[0].countryCode}`}>
              {group.letter}
            </a>
          ))}
        </nav>

        {/* Native details retain all country names for browser Find and keyboard
            navigation, while keeping per-mission contact information compact. */}
        <div className="coverage-list">
          {groups.map(group => (
            <section key={group.letter} className="coverage-letter-group" aria-labelledby={`coverage-letter-${group.countries[0].countryCode}`}>
              <h3 id={`coverage-letter-${group.countries[0].countryCode}`} className="coverage-letter">{group.letter}</h3>
              {group.countries.map(country => {
                const { approved, total } = getElectionEmailCoverage([country]);
                const status = approved === total ? 'confirmed' : approved > 0 ? 'partial' : 'unconfirmed';
                return (
                  <details key={country.countryCode} id={`coverage-country-${country.countryCode}`} className="coverage-country">
                    <summary>
                      <CountryFlag countryCode={country.countryCode} />
                      <span className="coverage-country-name">{script === 'cyrillic' ? country.labelCyr : country.label}</span>
                      <span className={`coverage-status coverage-status--${status}`}>
                        <span aria-hidden="true">{status === 'confirmed' ? '✓' : status === 'partial' ? '◐' : '✕'}</span>{' '}
                        {status === 'confirmed' ? t('Potvrđeno') : status === 'partial' ? `${t('Delimično')} · ${approved}/${total}` : t('Nije potvrđeno')}
                      </span>
                    </summary>
                    <div className="coverage-country-details">
                      {country.stations.map((station) => (
                        <article
                          key={station.id}
                          className="mission-card"
                          style={{
                            marginBottom: '0.75rem',
                            ...(station.electionContactApproval === 'unconfirmed'
                              ? {
                                  backgroundColor: 'var(--color-error-bg)',
                                  borderColor: '#fecaca',
                                }
                              : {}),
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
                          {station.electionContactApproval !== 'unconfirmed' ? (
                            <>
                              <p className="form-hint" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                {t('✓ Izborna i-mejl adresa je potvrđena.')}
                              </p>
                              <ElectionNoticeLink notice={station.electionNotice} status={station.electionNoticeStatus} showMissing />
                              <div className="mission-detail">
                                <strong>{t('Adresa za prijavu:')}</strong>
                                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{station.email}</span>
                              </div>
                            </>
                          ) : (
                            <p
                              className="form-hint"
                              style={{ marginTop: '0.5rem', color: 'var(--color-danger)' }}
                            >
                              {t('Izborna i-mejl adresa još nije potvrđena u ovom alatu.')}
                            </p>
                          )}
                          {station.electionContactApproval === 'unconfirmed' && (
                            <ElectionNoticeLink notice={station.electionNotice} status={station.electionNoticeStatus} />
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
                          <MissionInquiryLink
                            station={station}
                            countryName={script === 'cyrillic' ? country.labelCyr : country.label}
                          />
                        </article>
                      ))}
                      <a href={`/?country=${country.countryCode}${script === 'latin' ? '&script=latin' : ''}`} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                        {t('Započnite prijavu za ovu državu')} →
                      </a>
                    </div>
                  </details>
                );
              })}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};
