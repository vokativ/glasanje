import React, { useState, useEffect } from 'react';

// Expected deadline: ~22 days before October 25, 2026 election
// Target: October 3, 2026 23:59:59 CET (Belgrade UTC+2 in summer/early autumn)
const TARGET_DEADLINE_MS = new Date('2026-10-03T23:59:59+02:00').getTime();

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateRemaining(targetMs: number): TimeRemaining {
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(calculateRemaining(TARGET_DEADLINE_MS));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="countdown-card">
      <div className="countdown-header">
        Рок за пријаву за гласање из иностранства (очекивано)
      </div>

      {!time.isExpired ? (
        <div className="countdown-grid">
          <div className="countdown-box">
            <div className="countdown-num">{time.days}</div>
            <div className="countdown-lbl">дана</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.hours}</div>
            <div className="countdown-lbl">сати</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.minutes}</div>
            <div className="countdown-lbl">минута</div>
          </div>
          <div className="countdown-box">
            <div className="countdown-num">{time.seconds}</div>
            <div className="countdown-lbl">секунди</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0', fontWeight: 'bold', color: '#fca5a5' }}>
          Званични рок за пријаву је истекао или је у току закључење бирачког списка.
        </div>
      )}

      <div className="countdown-note">
        📢 <strong>Избори су расписани за 25. октобар 2026. године.</strong> Захтев за гласање у
        иностранству подноси се најкасније 5 дана пре закључења бирачког списка (члан 16. Закона).
        Препоручујемо да пријаву пошаљете што пре како би надлежна амбасада стигла да је обради.
      </div>
    </div>
  );
};
