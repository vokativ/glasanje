import React, { useMemo } from 'react';
import { COUNTRIES, type VotingCountry } from '../data/missions';
import { getStationElectionStatus, isElectionRecipientApproved } from '../lib/stationElectionStatus';
import { useScript, type Script } from '../lib/script';
import { CountryFlag } from './CountryFlag';
import { ElectionNoticeLink } from './ElectionNoticeLink';
import { MissionInquiryLink } from './MissionInquiryLink';
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
      (station) => isElectionRecipientApproved(station.electionContactApproval),
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
          <span className="coverage-status coverage-status--notice">⚠️ {t('Obaveštenje objavljeno')}</span>
          <span className="coverage-status coverage-status--unconfirmed">✕ {t('Bez potvrđene adrese')}</span>
        </div>
        <p className="form-hint" style={{ marginTop: '0.5rem' }}>
          {t('Delimično znači da neka predstavništva imaju potvrđenu adresu, a druga još nemaju. Žuta oznaka označava da je misija objavila izborno obaveštenje za 2026. godinu, ali bez posebne adrese za prijavu (ponuđen je opšti kontakt).')}
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
                const hasNoticeNoEmail = country.stations.some(
                  (station) => getStationElectionStatus(station) === 'notice-no-email'
                );
                const status: 'confirmed' | 'partial' | 'notice' | 'unconfirmed' =
                  approved === total
                    ? 'confirmed'
                    : approved > 0
                    ? 'partial'
                    : hasNoticeNoEmail
                    ? 'notice'
                    : 'unconfirmed';
                return (
                  <details key={country.countryCode} id={`coverage-country-${country.countryCode}`} className="coverage-country">
                    <summary>
                      <CountryFlag countryCode={country.countryCode} />
                      <span className="coverage-country-name">{script === 'cyrillic' ? country.labelCyr : country.label}</span>
                      <span className={`coverage-status coverage-status--${status}`}>
                        <span aria-hidden="true">
                          {status === 'confirmed' ? '✓' : status === 'partial' ? '◐' : status === 'notice' ? '⚠️' : '✕'}
                        </span>{' '}
                        {status === 'confirmed'
                          ? t('Potvrđeno')
                          : status === 'partial'
                          ? `${t('Delimično')} · ${approved}/${total}`
                          : status === 'notice'
                          ? t('Obaveštenje objavljeno')
                          : t('Nije potvrđeno')}
                      </span>
                    </summary>
                    <div className="coverage-country-details">
                      {country.stations.map((station) => {
                        const stationStatus = getStationElectionStatus(station);
                        return (
                          <article
                            key={station.id}
                            className={`mission-card${
                              stationStatus === 'notice-no-email'
                                ? ' mission-card--notice-no-email'
                                : stationStatus === 'unconfirmed'
                                ? ' mission-card--unconfirmed'
                                : ''
                            }`}
                            style={{
                              marginBottom: '0.75rem',
                              ...(stationStatus === 'notice-no-email'
                                ? {
                                    backgroundColor: 'var(--color-warning-bg)',
                                    borderColor: '#f59e0b',
                                  }
                                : stationStatus === 'unconfirmed'
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
                            {stationStatus === 'approved' ? (
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
                            ) : stationStatus === 'notice-no-email' ? (
                              <>
                                <p
                                  className="form-hint"
                                  style={{ marginTop: '0.5rem', color: '#b45309', fontWeight: 700 }}
                                >
                                  {t('⚠️ Obaveštenje objavljeno bez posebne izborne i-mejl adrese.')}
                                </p>
                                <ElectionNoticeLink notice={station.electionNotice} status={station.electionNoticeStatus} />
                                <div className="mission-detail">
                                  <strong>{t('Opšti kontakt misije:')}</strong>
                                  <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{station.email}</span>
                                </div>
                                <p className="form-hint" style={{ fontSize: '0.85rem' }}>
                                  {t('Prikazan je opšti kontakt misije. Prihvatanje prijave na ovu adresu nije zvanično potvrđeno.')}
                                </p>
                              </>
                            ) : (
                              <>
                                <p
                                  className="form-hint"
                                  style={{ marginTop: '0.5rem', color: 'var(--color-danger)' }}
                                >
                                  {t('Izborna i-mejl adresa još nije potvrđena u ovom alatu.')}
                                </p>
                                <ElectionNoticeLink notice={station.electionNotice} status={station.electionNoticeStatus} />
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
                            <MissionInquiryLink
                              station={station}
                              countryName={script === 'cyrillic' ? country.labelCyr : country.label}
                            />
                          </article>
                        );
                      })}
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
