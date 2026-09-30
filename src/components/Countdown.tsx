import React, { useState, useEffect } from 'react';
import { useScript } from '../lib/script';
import {
  TARGET_DEADLINE_MS,
  calculateRemaining,
  DEADLINE_DISPLAY_SR_CYR,
  DEADLINE_DISPLAY_SR_LAT,
} from '../lib/deadline';

export interface CountdownProps {
  nowMs?: number;
  timeSource?: 'server' | 'local';
}

export const Countdown: React.FC<CountdownProps> = ({ nowMs, timeSource }) => {
  const [internalNow, setInternalNow] = useState<number>(() => Date.now());
  const { script, t } = useScript();

  // If external nowMs is supplied (e.g. from App's synchronized clock), use it;
  // otherwise run the internal 1-second interval.
  const effectiveNow = nowMs ?? internalNow;

  useEffect(() => {
    if (nowMs !== undefined) return;
    const timer = setInterval(() => {
      setInternalNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [nowMs]);

  const time = calculateRemaining(TARGET_DEADLINE_MS, effectiveNow);
  const deadlineText = script === 'cyrillic' ? DEADLINE_DISPLAY_SR_CYR : DEADLINE_DISPLAY_SR_LAT;

  return (
    <div className="countdown-card">
      <div className="countdown-header">
        {t('Rok za prijavu za glasanje iz inostranstva')}
      </div>
      <div className="countdown-deadline">
        {deadlineText}
      </div>

      {!time.isExpired ? (
        <div className="countdown-grid">
          <div className="countdown-box">
            <div className="countdown-num">{time.days}</div>
            <div className="countdown-lbl">{t('dana')}</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.hours}</div>
            <div className="countdown-lbl">{t('sati')}</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.minutes}</div>
            <div className="countdown-lbl">{t('minuta')}</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.seconds}</div>
            <div className="countdown-lbl">{t('sekundi')}</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0', fontWeight: 'bold', color: '#fca5a5' }}>
          {timeSource === 'local'
            ? t('Prema lokalnom vremenu rok je istekao ili je u toku zaključenje biračkog spiska.')
            : t('Zvanični rok za prijavu je istekao ili je u toku zaključenje biračkog spiska.')}
        </div>
      )}

      <div className="countdown-note">
        📢 <strong>{t('Zvanični rok za prijavu:')}</strong>{' '}
        {t('3. oktobar 2026. godine u 24:00 (ponoć po vremenu u Srbiji).')}{' '}
        {t('Izbori su raspisani za 25. oktobar 2026. godine. Zahtev za glasanje u inostranstvu podnosi se najkasnije 5 dana pre zaključenja biračkog spiska (član 16. Zakona). Preporučujemo da prijavu pošaljete što pre kako bi nadležna ambasada stigla da je obradi.')}
      </div>
    </div>
  );
};
