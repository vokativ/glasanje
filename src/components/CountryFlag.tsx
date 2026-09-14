import React from 'react';
import { COUNTRY_BY_CODE } from '../data/missions';

// Decorative beside a written country name. Use the selected country's stable
// code, including non-resident coverage, rather than inferring a mission's flag.
export const CountryFlag: React.FC<{ countryCode?: string }> = ({ countryCode }) => {
  if (!countryCode || !COUNTRY_BY_CODE.has(countryCode)) return null;
  return (
    <img
      className="country-flag"
      src={`/assets/flags/${countryCode.toLowerCase()}.svg`}
      alt=""
      width="24"
      height="18"
      loading="lazy"
      decoding="async"
    />
  );
};
