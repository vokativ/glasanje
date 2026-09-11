import React, { useState, useEffect } from 'react';
import { useScript } from '../lib/script';

// Official deadline: 5 days before the closing of the voter list
// Confirmed by MDULS & MFA: October 3, 2026 at 24:00 (midnight) Belgrade local time (CEST, UTC+2)
export const TARGET_DEADLINE_MS = new Date('2026-10-03T22:00:00Z').getTime();

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function calculateRemaining(targetMs: number): TimeRemaining {
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false };
}

export const Countdown: React.FC = () => {
  const [time, setTime] = useState<TimeRemaining>(() => calculateRemaining(TARGET_DEADLINE_MS));
  const { t } = useScript();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(calculateRemaining(TARGET_DEADLINE_MS));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="countdown-card">
      <div className="countdown-header">
        {t('Rok za prijavu za glasanje iz inostranstva')}
      </div>
      <div className="countdown-deadline">
        {t('3. oktobar 2026. u 24:00 (ponoć po vremenu u Srbiji)')}
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
          {t('Zvanični rok za prijavu je istekao ili je u toku zaključenje biračkog spiska.')}
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
