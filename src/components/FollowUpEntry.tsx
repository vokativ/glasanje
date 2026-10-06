import React, { useId, useState } from 'react';
import {
  FOLLOW_UP_ASSISTANTS,
  FOLLOW_UP_DETAILED_PROMPT,
  FOLLOW_UP_SHORT_PROMPT,
} from '../lib/followUp';
import { useScript } from '../lib/script';
import { copyTextToClipboard } from '../lib/share';

export interface FollowUpEntryProps {
  compact?: boolean;
  standalone?: boolean;
}

/** Useful during server rendering too; only an explicit click touches the clipboard. */
export const FollowUpEntry: React.FC<FollowUpEntryProps> = ({ compact = false, standalone = false }) => {
  const { script, t } = useScript();
  const id = useId();
  const [feedback, setFeedback] = useState('');
  const guideUrl = script === 'latin' ? '/pracenje/latin/' : '/pracenje/';
  const copySuccess = t('Kopirano. Nalepite tekst u razgovor.');
  const copyFailure = t('Kopiranje nije uspelo. Označite tekst i kopirajte ga ručno.');
  const launchPending = t('Asistent se otvara. Ako je razgovor prazan, nalepite kopirani tekst.');
  const launchSuccess = t('Uputstvo je kopirano. Proverite tekst u asistentu pre slanja.');
  const launchFailure = t('Asistent se otvara, ali kopiranje nije uspelo. Kopirajte detaljno uputstvo ispod.');

  const copyPrompt = async (value: string, launching = false) => {
    if (launching) setFeedback(launchPending);
    try {
      const copied = await copyTextToClipboard(value);
      setFeedback(copied ? (launching ? launchSuccess : copySuccess) : (launching ? launchFailure : copyFailure));
    } catch {
      setFeedback(launching ? launchFailure : copyFailure);
    }
  };

  return (
    <section
      className={`card follow-up-entry${compact ? ' follow-up-entry--compact' : ''}`}
      aria-labelledby={`${id}-title`}
      data-follow-up-entry=""
      data-copy-success={copySuccess}
      data-copy-failure={copyFailure}
      data-launch-pending={launchPending}
      data-launch-success={launchSuccess}
      data-launch-failure={launchFailure}
    >
      <h2 id={`${id}-title`} className="card-title">
        {t('Prijava bez odgovora?')}
      </h2>
      <p className="follow-up-lead">
        {t('Proverite već poslati zahtev — sami ili uz svog asistenta.')}
      </p>
      {!compact && !standalone && (
        <>
          <h3 className="follow-up-subtitle">{t('Četiri koraka za proveru')}</h3>
          <ol className="follow-up-steps">
            <li>{t('Pronađite poslati zahtev, priloge i sve odgovore.')}</li>
            <li>{t('U istoj prepisci tražite potvrdu prijema i prosleđivanja od misije.')}</li>
            <li>{t('Zasebno proverite predmet kod nadležne službe biračkog spiska u Srbiji.')}</li>
            <li>{t('Sačuvajte pisani odgovor i proverite koja odluka još nedostaje.')}</li>
          </ol>
        </>
      )}
      <div className="follow-up-actions">
        {standalone ? (
          <a href="#manual" className="btn btn-navy">
            {t('Ručni koraci i obrasci')}
          </a>
        ) : (
          <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="btn btn-navy">
            {t('Ručni koraci i obrasci')}
          </a>
        )}
      </div>
      {compact ? (
        <p className="form-hint">{t('Vodič se otvara u novom tabu; vaš obrazac ostaje ovde.')}</p>
      ) : (
        <>
          <h3 className="follow-up-subtitle">{t('Uz pomoć asistenta')}</h3>
          <p className="follow-up-launch-instructions">
            {t('Dugmad otvaraju novi razgovor i kopiraju detaljno uputstvo. Ako je razgovor prazan, nalepite tekst.')}
          </p>
          <div className="follow-up-providers">
            {FOLLOW_UP_ASSISTANTS.map((assistant) => (
              <div className="follow-up-provider" key={assistant.id}>
                <a
                  href={assistant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  data-follow-up-provider={assistant.id}
                  data-copy-value={FOLLOW_UP_DETAILED_PROMPT}
                  onClick={() => { void copyPrompt(FOLLOW_UP_DETAILED_PROMPT, true); }}
                >
                  {t('Otvori ')}{assistant.label}
                </a>
              </div>
            ))}
          </div>
          <p>{t('Dajte svom asistentu ovu rečenicu:')}</p>
          <div className="follow-up-prompt-box">
            <p className="follow-up-prompt" lang="sr-Cyrl" data-follow-up-short-prompt="">{FOLLOW_UP_SHORT_PROMPT}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              data-follow-up-copy="short"
              data-copy-value={FOLLOW_UP_SHORT_PROMPT}
              onClick={() => { void copyPrompt(FOLLOW_UP_SHORT_PROMPT); }}
            >
              {t('Kopiraj kratku rečenicu')}
            </button>
          </div>
          <details className="follow-up-details">
            <summary>{t('Mejl, režimi rada i privatnost')}</summary>
            <p className="form-hint">
              {t('Povezivanje mejla je opciono. Ako je dostupno, izaberite ')}
              Work {t('u ')}ChatGPT{t('-u, ')}Spark {t('u ')}Gemini{t('-ju ili ')}Cowork {t('u ')}Claude{t('-u. Veza ne bira režim i ne šalje poruku.')}
            </p>
            <p className="follow-up-privacy">
              {t('Sajt ne čuva predmet niti prosleđuje podatke iz obrasca asistentu. Prepisku koju podelite obrađuje pružalac usluge asistenta. Dozvolu za mejl ograničite na prijavu; ne delite JMBG ili sken pasoša za početnu proveru. Pre slanja pregledajte primaoce, tekst i priloge i odobrite slanje. Preuzet PDF nije dokaz slanja zahteva.')}
            </p>
          </details>
          <details className="follow-up-details">
            <summary>{t('Detaljno uputstvo — prikaži i kopiraj')}</summary>
            <div className="follow-up-prompt-box">
              <p className="follow-up-prompt" lang="sr-Cyrl" data-follow-up-detailed-prompt="">{FOLLOW_UP_DETAILED_PROMPT}</p>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                data-follow-up-copy="detailed"
                data-copy-value={FOLLOW_UP_DETAILED_PROMPT}
                onClick={() => { void copyPrompt(FOLLOW_UP_DETAILED_PROMPT); }}
              >
                {t('Kopiraj detaljno uputstvo')}
              </button>
            </div>
          </details>
          <p className="follow-up-feedback" data-follow-up-feedback="" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
        </>
      )}
      {!compact && <p className="form-hint">{t('Negativno rešenje ili kratak rok? Odmah proverite pravni lek — urgencija ne zaustavlja rok. Nije nova prijava niti potvrda prava na glasanje.')}</p>}
    </section>
  );
};
