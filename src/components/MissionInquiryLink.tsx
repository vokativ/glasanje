import React from 'react';
import type { PollingStation } from '../data/missions';
import { buildMissionInquiryUrl } from '../lib/missionInquiry';
import { useScript } from '../lib/script';

export const MissionInquiryLink: React.FC<{ station: PollingStation; countryName: string }> = ({
  station,
  countryName,
}) => {
  const { script, t } = useScript();
  const href = buildMissionInquiryUrl(station, countryName, script);
  if (!href) return null;

  return (
    <div className="mission-inquiry" style={{ marginTop: '0.75rem' }}>
      <a href={href} className="btn btn-sm btn-outline">
        {t('Pitajte misiju za uputstvo')} ✉
      </a>
      <p className="form-hint" style={{ overflowWrap: 'anywhere' }}>
        {t('Pripremljen upit za:')} {station.email}.{' '}
        {t('Otvara vašu aplikaciju za e-poštu. Poruku pregledate i šaljete sami.')}
      </p>
    </div>
  );
};
