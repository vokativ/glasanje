import React from 'react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Полиса приватности и безбедност података</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Затвори"
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            🔒 <strong>Ваши подаци никада не напуштају ваш уређај.</strong><br />
            Апликација ради 100% локално у вашем веб прегледачу. Ниједан податак (име, ЈМБГ, адреса,
            потпис, слика пасоша) се не шаље на сервер, нити се чува у било каквој бази података.
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-primary)' }}>
            1. Како можете сами да проверите ову тврдњу?
          </h3>
          <p>
            Ово није само обећање — можете сами технички проверити да алат ради потпуно локално:
          </p>
          <ol style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>Отворите ову страницу и сачекајте да се учита.</li>
            <li><strong>Искључите интернет</strong> (укључите авио-режим или искључите Wi-Fi/мрежу).</li>
            <li>Попуните формулар, потпишите се и кликните на „Преузми формулар“.</li>
            <li>
              Видећете да алат и даље <strong>несметано функционише и генерише комплетан PDF</strong>!
              Ово доказује да се сва обрада и израда документа одвија искључиво на вашем рачунару/телефону.
            </li>
          </ol>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            2. Зашто алат не шаље мејл аутоматски уместо вас?
          </h3>
          <p>
            Алат намерно не користи сервер за аутоматско слање мејлова, из два кључна разлога:
          </p>
          <ul style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li>
              <strong>Приватност:</strong> Да би сервер послао мејл, морали бисмо да примимо ваш ЈМБГ и слику
              пасоша на наш сервер, што одбијамо да радимо.
            </li>
            <li>
              <strong>Правни доказ:</strong> Када пријаву пошаљете директно са свог личне адресе, у вашој
              фасцикли <em>Sent (Послато)</em> остаје неоспорив правни доказ да сте пријаву благовремено упутили
              надлежном дипломатско-конзуларном представништву.
            </li>
          </ul>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            3. Отворени изворни код (Open-Source)
          </h3>
          <p>
            Комплетан изворни код ове апликације је јавно доступан свакоме на увид и ревизију.
            Свако може проверити тачан код који се извршава у прегледачу.
          </p>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-primary)' }}>
            4. Одрицање одговорности
          </h3>
          <p>
            Овај сајт је независна волонтерска иницијатива српске дијаспоре и <strong>није званични сајт
            државних органа Републике Србије</strong>. Сврха алата је искључиво олакшавање попуњавања законом
            прописаног обрасца и повезивање са надлежном амбасадом или конзулатом.
          </p>

          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button type="button" onClick={onClose} className="btn btn-navy">
              Разумем и слажем се
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
