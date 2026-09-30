import React from 'react';
import { useScript } from '../lib/script';
import {
  DEADLINE_DISPLAY_SR_CYR,
  DEADLINE_DISPLAY_SR_LAT,
  GITHUB_REPO_URL,
  MDULS_NOTICE_URL,
  MDULS_VOTER_REGISTRY_URL,
} from '../lib/deadline';

export type PostDeadlineNoticeProps =
  | { variant: 'closed' }
  | { variant: 'advisory'; timeConfirmed?: boolean };

export const PostDeadlineNotice: React.FC<PostDeadlineNoticeProps> = (props) => {
  const { script, t } = useScript();
  const deadlineText = script === 'cyrillic' ? DEADLINE_DISPLAY_SR_CYR : DEADLINE_DISPLAY_SR_LAT;
  const statusLink = script === 'latin' ? '/status?script=latin' : '/status';

  if (props.variant === 'advisory') {
    const isConfirmed = props.timeConfirmed ?? true;
    return (
      <aside
        className="alert alert-warning post-deadline-advisory"
        role="status"
        aria-atomic="true"
        aria-label={t('Obaveštenje o isteku roka')}
      >
        <span className="post-deadline-advisory-icon" aria-hidden="true">
          ⚠️
        </span>
        <div className="post-deadline-advisory-body">
          <strong>{t('Zvanični rok za prijavu je istekao.')}</strong>{' '}
          {isConfirmed
            ? t(
                'Možete dovršiti obrazac i preuzeti PDF, ali diplomatsko-konzularno predstavništvo možda više ne može da ga obradi.',
              )
            : t(
                'Sat na vašem uređaju pokazuje da je rok istekao, ali tačno vreme nije potvrđeno sa servera. Možete nesmetano dovršiti i preuzeti svoj obrazac.',
              )}
        </div>
      </aside>
    );
  }

  return (
    <section className="card post-deadline-card" aria-labelledby="post-deadline-title">
      <div className="post-deadline-badge" aria-hidden="true">
        ⏳
      </div>
      <h2 id="post-deadline-title" className="card-title post-deadline-title">
        {t('Rok za prijavu za glasanje iz inostranstva je istekao')}
      </h2>
      <p className="card-subtitle post-deadline-lead">
        {t(
          'Rok za podnošenje zahteva za upis u birački spisak za glasanje u inostranstvu na izborima raspisanim za 25. oktobar 2026. godine istekao je:',
        )}{' '}
        <strong>{deadlineText}</strong>.
      </p>

      <div className="post-deadline-info-box">
        <p className="post-deadline-info-heading">
          📌 <strong>{t('Važne informacije i provera statusa:')}</strong>
        </p>
        <ul className="post-deadline-links-list">
          <li>
            <a
              href={MDULS_VOTER_REGISTRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="post-deadline-link"
            >
              {t('Proverite upis u Jedinstveni birački spisak (MDULS portal)')}
              <span aria-hidden="true"> ↗</span>
            </a>
          </li>
          <li>
            <a href={statusLink} className="post-deadline-link">
              {t('Arhiva kontakata i zvaničnih obaveštenja ambasada i konzulata')}
              <span aria-hidden="true"> →</span>
            </a>
          </li>
          <li>
            <a
              href={MDULS_NOTICE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="post-deadline-link"
            >
              {t('Zvanično obaveštenje i instrukcije Ministarstva (MDULS)')}
              <span aria-hidden="true"> ↗</span>
            </a>
          </li>
        </ul>
      </div>

      <p className="post-deadline-disclaimer">
        {t(
          'Prikaz vremena na ovom sajtu je informativan. O prijemu i prihvatanju zahteva odlučuju isključivo nadležna diplomatsko-konzularna predstavništva i nadležno Ministarstvo u skladu sa Zakonom o jedinstvenom biračkom spisku.',
        )}
      </p>

      <div className="post-deadline-footer">
        <p className="post-deadline-repo-note">
          {t('Izvorni kod ovog alata ostaje otvoren i dostupan za buduće izbore na:')}{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="post-deadline-repo-link"
          >
            GitHub (vokativ/glasanje)
            <span aria-hidden="true"> ↗</span>
          </a>
        </p>
      </div>
    </section>
  );
};
