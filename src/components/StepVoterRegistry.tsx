import React from 'react';

interface StepVoterRegistryProps {
  onProceed: () => void;
}

export const StepVoterRegistry: React.FC<StepVoterRegistryProps> = ({ onProceed }) => {
  return (
    <div className="card">
      <h2 className="card-title">Корак 1: Провера уписа у бирачки списак</h2>
      <p className="card-subtitle">
        Пре подношења захтева за гласање у иностранству, неопходно је да проверите да ли сте већ
        уписани у Јединствени бирачки списак (ЈБС) Републике Србије.
      </p>

      <details className="alert alert-info">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Како да проверите упис у бирачки списак?
        </summary>
        <p style={{ marginTop: '0.5rem' }}>
          Отворите званични портал Министарства државне управе и локалне самоуправе и унесите свој
          ЈМБГ и број важеће личне карте или пасоша.
        </p>
        <div style={{ marginTop: '0.75rem' }}>
          <a
            href="https://upit.birackispisak.gov.rs/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-navy"
          >
            ↗ Отвори проверу бирачког списка (upit.birackispisak.gov.rs)
          </a>
        </div>
      </details>

      <div style={{ margin: '1.25rem 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          Изаберите свој статус:
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onProceed}
            className="btn btn-primary btn-block"
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '1rem' }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>✓ Уписан/а сам у бирачки списак</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Наставите поступак попуњавања захтева за гласање у иностранству
              </div>
            </div>
            <span aria-hidden="true">→</span>
          </button>

          <details style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
            <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary)' }}>
              Шта ако нисам уписан/а у бирачки списак?
            </summary>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5, color: '#475569' }}>
              <p>
                Уколико нисте уписани у Јединствени бирачки списак (на пример, ако сте пунолетство
                стекли у иностранству или раније нисте вадили личну карту у Србији), неопходно је да
                дипломатско-конзуларном представништву поднесете <strong>два захтева истовремено</strong>:
              </p>
              <ol style={{ marginLeft: '1.25rem', marginTop: '0.35rem' }}>
                <li>Захтев за упис у Јединствени бирачки списак</li>
                <li>Захтев за упис податка да ћете гласати у иностранству</li>
              </ol>
              <p style={{ marginTop: '0.5rem' }}>
                Овај алат попуњава образац под бројем 2. Након што попуните овај захтев, можете
                на контактима амбасаде затражити и образац за упис у бирачки списак.
              </p>
              <button
                type="button"
                onClick={onProceed}
                className="btn btn-sm btn-primary"
                style={{ marginTop: '0.75rem' }}
              >
                Настави са попуњавањем овог захтева →
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
