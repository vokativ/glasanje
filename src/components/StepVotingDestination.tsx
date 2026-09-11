import React, { useMemo, useState } from 'react';
import { COUNTRY_BY_CODE, COUNTRIES, type VotingCountry } from '../data/missions';
import { resolveCurrentElectionContact } from '../lib/electionContact';
import { latinToCyrillic, type Script, useScript } from '../lib/script';

export interface VotingDestinationData {
  countryCode: string;
  stationId: string | null;
  foreignAddress: string;
  desiredLocation: string;
}

export interface VotingDestinationSelection {
  countryCode: string;
  stationId: string | null;
}

const normalizeCountrySearchTerm = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const englishCountryNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const getEnglishCountryName = (countryCode: string) => {
  try {
    return englishCountryNames?.of(countryCode) ?? '';
  } catch (error) {
    if (error instanceof RangeError) return '';
    throw error;
  }
};

const TAIWAN_SEARCH_ALIASES = ['Тајван', 'Tajvan', 'Taiwan', 'Taiwanese passports'];

export const getTaiwanSearchNotice = (
  searchFilter: string,
  translate: (value: string) => string = latinToCyrillic
) => {
  const normalizedTerm = normalizeCountrySearchTerm(searchFilter.trim());
  if (
    !normalizedTerm ||
    !TAIWAN_SEARCH_ALIASES.some((alias) =>
      normalizeCountrySearchTerm(alias).startsWith(normalizedTerm)
    )
  ) {
    return null;
  }

  return translate(
    'Za Tajvan u priloženim podacima MSP nije potvrđena nadležnost za upis u birački spisak. ' +
      'Ručno proverite aktuelna zvanična uputstva MSP ili nadležnog predstavništva; ova pretraga ne bira predstavništvo.'
  );
};

const countrySearchTermsByCode: Record<string, string[]> = Object.fromEntries(
  COUNTRIES.map((country) => [
    country.countryCode,
    [
      country.label,
      country.labelCyr,
      ...(country.aliases ?? []),
      getEnglishCountryName(country.countryCode),
    ],
  ])
);

const COVERED_COUNTRY_COUNT = COUNTRIES.reduce(
  (count, country) => count + Number(country.stations.length > 0),
  0
);

export const filterCountries = (searchFilter: string): VotingCountry[] => {
  const term = searchFilter.trim();
  if (!term) return COUNTRIES;

  if (/^[A-Za-z]{2}$/.test(term)) {
    return COUNTRIES.filter((country) => country.countryCode === term.toUpperCase());
  }

  const normalizedTerm = normalizeCountrySearchTerm(term);
  return COUNTRIES.filter((country) =>
    countrySearchTermsByCode[country.countryCode].some((alias) =>
      normalizeCountrySearchTerm(alias).includes(normalizedTerm)
    )
  );
};

export const getCountryTypeaheadResults = (searchFilter: string): VotingCountry[] =>
  searchFilter.trim() ? filterCountries(searchFilter).slice(0, 12) : [];

export const resolveVotingDestinationSelection = (
  countryCode: string,
  stationId: string | null = null
): VotingDestinationSelection => {
  const country = COUNTRY_BY_CODE.get(countryCode);
  if (!country) return { countryCode: '', stationId: null };

  const selectedStationId = country.stations.some((station) => station.id === stationId)
    ? stationId
    : country.stations[0]?.id ?? null;

  return { countryCode, stationId: selectedStationId };
};

const formatCountryOptionLabel = (country: VotingCountry, script: Script) => {
  const label = script === 'cyrillic' ? country.labelCyr : country.label;
  const englishName = getEnglishCountryName(country.countryCode);

  if (country.countryCode === 'US') {
    return `${label} (${script === 'cyrillic' ? 'САД' : 'SAD'}) [${country.countryCode}]`;
  }

  return `${label}${englishName && englishName !== country.label ? ` / ${englishName}` : ''} [${country.countryCode}]`;
};


interface StepVotingDestinationProps {
  initialData?: Partial<VotingDestinationData>;
  now?: number;
  onDraftChange: (data: VotingDestinationData) => void;
  onBack: () => void;
  onNext: (data: VotingDestinationData) => void;
}

export const StepVotingDestination: React.FC<StepVotingDestinationProps> = ({
  initialData,
  now,
  onDraftChange,
  onBack,
  onNext,
}) => {
  const [selection, setSelection] = useState(() =>
    resolveVotingDestinationSelection(
      initialData?.countryCode ?? '',
      initialData?.stationId ?? null
    )
  );
  const { script, t } = useScript();
  const [foreignAddress, setForeignAddress] = useState<string>(initialData?.foreignAddress ?? '');
  const [desiredLocation, setDesiredLocation] = useState<string>(initialData?.desiredLocation ?? '');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activeCountryIndex, setActiveCountryIndex] = useState(-1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const currentCountry = useMemo(
    () => COUNTRY_BY_CODE.get(selection.countryCode),
    [selection.countryCode]
  );
  const currentStation = useMemo(() => {
    if (!currentCountry || !selection.stationId) return null;
    return currentCountry.stations.find((station) => station.id === selection.stationId) ?? null;
  }, [currentCountry, selection.stationId]);
  const electionContact = useMemo(
    () => (currentStation ? resolveCurrentElectionContact(currentStation, now) : null),
    [currentStation, now],
  );
  const countryResults = useMemo(() => getCountryTypeaheadResults(searchFilter), [searchFilter]);

  const taiwanSearchNotice = useMemo(
    () => getTaiwanSearchNotice(searchFilter, t),
    [searchFilter, t]
  );

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRY_BY_CODE.get(countryCode);
    if (!country) return;

    const nextSelection = resolveVotingDestinationSelection(countryCode);
    setSelection(nextSelection);
    onDraftChange({
      ...nextSelection,
      foreignAddress,
      desiredLocation,
    });
    setSearchFilter(script === 'cyrillic' ? country.labelCyr : country.label);
    setActiveCountryIndex(-1);
  };

  const handleCountrySearchInput = (value: string) => {
    setSearchFilter(value);
    setActiveCountryIndex(-1);
  };

  const handleCountrySearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!countryResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveCountryIndex((previous) =>
        previous < countryResults.length - 1 ? previous + 1 : 0
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCountryIndex((previous) =>
        previous > 0 ? previous - 1 : countryResults.length - 1
      );
    } else if (event.key === 'Enter' && activeCountryIndex >= 0) {
      event.preventDefault();
      handleCountryChange(countryResults[activeCountryIndex].countryCode);
    } else if (event.key === 'Escape') {
      setSearchFilter('');
      setActiveCountryIndex(-1);
    }
  };

  const isForeignAddressValid = foreignAddress.trim().length > 0;
  const isFormValid = Boolean(currentCountry && currentStation && isForeignAddressValid);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ foreignAddress: true });
    if (isFormValid && currentStation) {
      onNext({
        countryCode: selection.countryCode,
        stationId: currentStation.id,
        foreignAddress: foreignAddress.trim(),
        desiredLocation: desiredLocation.trim(),
      });
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">{t('Korak 3: Država boravka i izborno mesto')}</h2>
      <p className="card-subtitle">
        {t(
          'Izaberite državu u kojoj boravite u inostranstvu, a zatim potvrdite nadležnu ambasadu ili generalni konzulat Republike Srbije.'
        )}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="countrySearch">
            {t('Pretraga države boravka')}
          </label>
          <input
            id="countrySearch"
            name="countrySearch"
            type="text"
            autoComplete="off"
            className="form-control"
            placeholder={t('Unesite naziv države (ćirilicom ili latinicom)...')}
            value={searchFilter}
            onInput={(e) => handleCountrySearchInput(e.currentTarget.value)}
            onKeyDown={handleCountrySearchKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-controls="countrySearchResults"
            aria-activedescendant={
              activeCountryIndex >= 0
                ? `country-option-${countryResults[activeCountryIndex]?.countryCode}`
                : undefined
            }
            aria-expanded={countryResults.length > 0}
          />
          {searchFilter.trim() && (
            <div
              id="countrySearchResults"
              role="listbox"
              aria-label={t('Rezultati pretrage država')}
              style={{
                maxHeight: '15rem',
                overflowY: 'auto',
                marginTop: '0.35rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.35rem',
              }}
            >
              {taiwanSearchNotice && (
                <div
                  className="form-hint"
                  role="status"
                  style={{
                    margin: '0.65rem 0.85rem',
                    padding: '0.65rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.35rem',
                  }}
                >
                  {taiwanSearchNotice}
                </div>
              )}
              {countryResults.length ? (
                countryResults.map((country, index) => (
                  <button
                    id={`country-option-${country.countryCode}`}
                    key={country.countryCode}
                    type="button"
                    role="option"
                    aria-selected={selection.countryCode === country.countryCode}
                    onClick={() => handleCountryChange(country.countryCode)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: 0,
                      borderBottom:
                        index < countryResults.length - 1 ? '1px solid var(--color-border)' : 0,
                      background:
                        activeCountryIndex === index ||
                        selection.countryCode === country.countryCode
                          ? 'rgb(29 78 216 / 0.1)'
                          : 'var(--color-surface)',
                      color: 'inherit',
                      cursor: 'pointer',
                      font: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    {formatCountryOptionLabel(country, script)}
                  </button>
                ))
              ) : (
                !taiwanSearchNotice && (
                  <div className="form-hint" style={{ margin: '0.65rem 0.85rem' }}>
                    {t('Nema država koje odgovaraju pretrazi.')}
                  </div>
                )
              )}
            </div>
          )}
          {currentCountry && (
            <span className="form-hint" aria-live="polite">
              {t('Izabrana država: ')}{formatCountryOptionLabel(currentCountry, script)}
            </span>
          )}
          <span className="form-hint">
            {t('Podaci sadrže predstavništva za ')}{COVERED_COUNTRY_COUNT} {t('država.')}
          </span>
        </div>


        {currentCountry &&
          (currentCountry.stations.length === 0 ? (
            <div className="form-group">
              <div className="form-hint" role="status" aria-live="polite">
                {t(
                  'Za izabranu državu nema navedenog diplomatsko-konzularnog predstavništva u priloženim podacima Ministarstva spoljnih poslova.'
                )}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="stationSelect">
                {t('Diplomatsko-konzularno predstavništvo u ovoj državi *')}
              </label>
              {currentCountry.stations.length > 1 && (
                <span className="mission-selection-hint">
                  {t(
                    'Za ovu državu ima više predstavništava: izaberite ono koje je nadležno za vas ili vam je najbliže.'
                  )}
                </span>
              )}
              <select
                id="stationSelect"
                name="stationSelect"
                autoComplete="off"
                className="form-control"
                value={selection.stationId ?? ''}
                onChange={(event) => {
                  const stationId = event.target.value || null;
                  setSelection((previous) => ({ ...previous, stationId }));
                  onDraftChange({
                    ...selection,
                    stationId,
                    foreignAddress,
                    desiredLocation,
                  });
                }}
                required
              >
                <option value="">{t('Izaberite diplomatsko-konzularno predstavništvo…')}</option>
                {currentCountry.stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {script === 'cyrillic' ? station.embassyCyr : station.embassy}
                  </option>
                ))}
              </select>
            </div>
          ))}

        {currentCountry && currentStation && electionContact && (
          <div
            className={`mission-card${
              electionContact.electionAuthority ? '' : ' mission-card--unconfirmed'
            }`}
          >
            <div className="mission-title">
              🏛️ {script === 'cyrillic' ? currentStation.embassyCyr : currentStation.embassy}
            </div>

            {!currentStation.isResident && (
              <span className="mission-coverage-badge">
                {t('Ovo predstavništvo je nadležno za birače u državi ')}
                <strong>{script === 'cyrillic' ? currentCountry.labelCyr : currentCountry.label}</strong>
                {t(' na nerezidencijalnoj osnovi.')}
              </span>
            )}

            {currentStation.address && (
              <div className="mission-detail">
                <strong>{t('Adresa:')}</strong>
                <span>{currentStation.address}</span>
              </div>
            )}

            <div className="mission-detail">
              <strong>{t('Objavljeni opšti kontakt misije/konzulata:')}</strong>
              <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                {electionContact.missionEmail}
              </span>
            </div>
            {electionContact.electionAuthority ? (
              <>
                <p className="form-hint">{t('Kontakt za prijavu za glasanje je potvrđen.')}</p>
                <div className="mission-detail">
                  <strong>{t('Adresa za prijavu za glasanje:')}</strong>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                    {electionContact.electionAuthority.email}
                  </span>
                </div>
                <div className="mission-detail">
                  <strong>{t('Izvor potvrđene adrese:')}</strong>
                  <a
                    href={electionContact.electionAuthority.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                  >
                    {t('Zvanično izborno obaveštenje')} ↗
                  </a>
                </div>
              </>
            ) : (
              <p className="mission-warning" role="alert">
                {t(
                  'Ovo je opšti kontakt misije. Nije potvrđen kao adresa za prijavu za glasanje; proverite aktuelno izborno obaveštenje na zvaničnom sajtu ispod.'
                )}
              </p>
            )}

            {currentStation.website && (
              <div className="mission-detail">
                <strong>{t('Zvanični sajt:')}</strong>
                <a
                  href={currentStation.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                  {currentStation.website} ↗
                </a>
              </div>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label" htmlFor="foreignAddress">
            {t('Adresa boravka u inostranstvu *')}
          </label>
          <textarea
            id="foreignAddress"
            name="foreignAddress"
            autoComplete="section-foreign street-address"
            rows={3}
            className={`form-control ${
              touched.foreignAddress && !isForeignAddressValid ? 'is-invalid' : ''
            }`}
            placeholder={t('Ulica, broj, grad i država')}
            value={foreignAddress}
            onChange={(event) => {
              const value = event.target.value;
              setForeignAddress(value);
              onDraftChange({ ...selection, foreignAddress: value, desiredLocation });
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, foreignAddress: true }))}
            required
          />
          <span className="form-hint">
            {t('Unesite vašu tačnu adresu u inostranstvu (ulica, broj, poštanski broj, grad, država)')}
          </span>
          {touched.foreignAddress && !isForeignAddressValid && (
            <span className="form-error">{t('Adresa u inostranstvu je obavezna')}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="desiredLocation">
            {t('Željeno mesto glasanja (opciono)')}
          </label>
          <input
            id="desiredLocation"
            name="desiredLocation"
            type="text"
            autoComplete="off"
            className="form-control"
            placeholder={t('npr. San Francisko')}
            value={desiredLocation}
            onChange={(event) => {
              const value = event.target.value;
              setDesiredLocation(value);
              onDraftChange({ ...selection, foreignAddress, desiredLocation: value });
            }}
          />
          <span className="form-hint">
            {t(
              'Ako ne možete da putujete do sedišta ambasade ili konzulata, unesite željeni grad. Pravilo o najmanje 100 birača je opšti prag, uz zakonom predviđene izuzetke; Republička izborna komisija utvrđuje da li će biti otvoreno posebno biračko mesto. '
            )}
            <a
              href="https://www.pravno-informacioni-sistem.rs/SlGlasnikPortal/eli/rep/sgrs/skupstina/zakon/2022/14/2/reg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
            >
              {t('Član 57')}
            </a>{' '}
            {t('(zvanična PIS stranica može sporije da se učita).')}
          </span>
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            {t('← Nazad')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isFormValid}>
            {t('Nastavi na potpis i dokumenta →')}
          </button>
        </div>
      </form>
    </div>
  );
};
