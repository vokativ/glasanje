import React, { useMemo, useState } from 'react';
import { COUNTRY_BY_CODE, COUNTRIES, type VotingCountry } from '../data/missions';

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

export const getTaiwanSearchNotice = (searchFilter: string) => {
  const normalizedTerm = normalizeCountrySearchTerm(searchFilter.trim());
  if (
    !normalizedTerm ||
    !TAIWAN_SEARCH_ALIASES.some((alias) =>
      normalizeCountrySearchTerm(alias).startsWith(normalizedTerm)
    )
  ) {
    return null;
  }

  return (
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

const formatCountryOptionLabel = (country: VotingCountry) => {
  const englishName = getEnglishCountryName(country.countryCode);

  if (country.countryCode === 'US') {
    return `${country.label} (SAD) [${country.countryCode}]`;
  }

  return `${country.label}${englishName && englishName !== country.label ? ` / ${englishName}` : ''} [${country.countryCode}]`;
};


interface StepVotingDestinationProps {
  initialData?: Partial<VotingDestinationData>;
  onBack: () => void;
  onNext: (data: VotingDestinationData) => void;
}

export const StepVotingDestination: React.FC<StepVotingDestinationProps> = ({
  initialData,
  onBack,
  onNext,
}) => {
  const [selection, setSelection] = useState(() =>
    resolveVotingDestinationSelection(
      initialData?.countryCode ?? '',
      initialData?.stationId ?? null
    )
  );
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
  const countryResults = useMemo(() => getCountryTypeaheadResults(searchFilter), [searchFilter]);

  const taiwanSearchNotice = useMemo(() => getTaiwanSearchNotice(searchFilter), [searchFilter]);

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRY_BY_CODE.get(countryCode);
    if (!country) return;

    setSelection(resolveVotingDestinationSelection(countryCode));
    setSearchFilter(country.label);
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
      <h2 className="card-title">Korak 3: Država boravka i izborno mesto</h2>
      <p className="card-subtitle">
        Izaberite državu u kojoj boravite u inostranstvu, a zatim potvrdite nadležnu ambasadu
        ili generalni konzulat Republike Srbije.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="countrySearch">
            Pretraga države boravka
          </label>
          <input
            id="countrySearch"
            name="countrySearch"
            type="text"
            autoComplete="off"
            className="form-control"
            placeholder="Unesite naziv države (ćirilicom ili latinicom)..."
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
              aria-label="Rezultati pretrage država"
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
                    {formatCountryOptionLabel(country)}
                  </button>
                ))
              ) : (
                !taiwanSearchNotice && (
                  <div className="form-hint" style={{ margin: '0.65rem 0.85rem' }}>
                    Nema država koje odgovaraju pretrazi.
                  </div>
                )
              )}
            </div>
          )}
          {currentCountry && (
            <span className="form-hint" aria-live="polite">
              Izabrana država: {formatCountryOptionLabel(currentCountry)}
            </span>
          )}
          <span className="form-hint">
            Ukupno obuhvaćeno 195 država prema zvaničnoj evidenciji Ministarstva spoljnih poslova
          </span>
        </div>


        {currentCountry && (
          <div className="form-group">
            <label className="form-label" htmlFor="stationSelect">
              Diplomatsko-konzularno predstavništvo u ovoj državi *
            </label>
            {currentCountry.stations.length > 1 && (
              <span className="mission-selection-hint">
                Za ovu državu ima više predstavništava: izaberite ono koje je nadležno za vas ili vam
                je najbliže.
              </span>
            )}
            <select
              id="stationSelect"
              name="stationSelect"
              autoComplete="off"
              className="form-control"
              value={selection.stationId ?? ''}
              onChange={(e) =>
                setSelection((previous) => ({ ...previous, stationId: e.target.value || null }))
              }
              required
            >
              <option value="">Izaberite diplomatsko-konzularno predstavništvo…</option>
              {currentCountry.stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.embassy}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentCountry && currentStation && (
          <div className="mission-card">
            <div className="mission-title">
              🏛️ {currentStation.embassy}
            </div>

            {!currentStation.isResident && (
              <span className="mission-coverage-badge">
                Pokriva na nerezidencijalnoj osnovi državu {currentCountry.label}
              </span>
            )}

            {currentStation.address && (
              <div className="mission-detail">
                <strong>Adresa:</strong>
                <span>{currentStation.address}</span>
              </div>
            )}

            <div className="mission-detail">
              <strong>Objavljeni kontakt misije/konzulata:</strong>
              <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                {currentStation.email}
              </span>
            </div>
            <p className="form-hint" style={{ margin: '0.5rem 0 0' }}>
              Kontakt je objavila misija/MSP. Pre slanja proverite obaveštenje za izbore 2026. na
              zvaničnom sajtu ispod; prihvatanje zahteva na ovu adresu nije potvrđeno.
            </p>

            {currentStation.website && (
              <div className="mission-detail">
                <strong>Zvanični sajt:</strong>
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
            Adresa boravka u inostranstvu *
          </label>
          <input
            id="foreignAddress"
            name="foreignAddress"
            type="text"
            autoComplete="section-foreign street-address"
            className={`form-control ${
              touched.foreignAddress && !isForeignAddressValid ? 'is-invalid' : ''
            }`}
            placeholder="npr. 15 Happy St, San Francisco 94040 CA ili 7500E Beach Road, Singapore"
            value={foreignAddress}
            onChange={(e) => setForeignAddress(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, foreignAddress: true }))}
            required
          />
          <span className="form-hint">
            Unesite vašu tačnu adresu u inostranstvu (ulica, broj, poštanski broj, grad, država)
          </span>
          {touched.foreignAddress && !isForeignAddressValid && (
            <span className="form-error">Adresa u inostranstvu je obavezna</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="desiredLocation">
            Željeno mesto glasanja (opciono)
          </label>
          <input
            id="desiredLocation"
            name="desiredLocation"
            type="text"
            autoComplete="off"
            className="form-control"
            placeholder="npr. San Francisko (ako ambasada nije u vašem gradu)"
            value={desiredLocation}
            onChange={(e) => setDesiredLocation(e.target.value)}
          />
          <span className="form-hint">
            Ako ne možete da putujete do sedišta ambasade ili konzulata, unesite željeni grad.
            Pravilo o najmanje 100 birača je opšti prag, uz zakonom predviđene izuzetke; Republička
            izborna komisija utvrđuje da li će biti otvoreno posebno biračko mesto.{' '}
            <a
              href="https://www.pravno-informacioni-sistem.rs/SlGlasnikPortal/eli/rep/sgrs/skupstina/zakon/2022/14/2/reg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
            >
              Član 57
            </a>{' '}
            (zvanična PIS stranica može sporije da se učita).
          </span>
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            ← Nazad
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isFormValid}>
            Nastavi na potpis i dokumenta →
          </button>
        </div>
      </form>
    </div>
  );
};
