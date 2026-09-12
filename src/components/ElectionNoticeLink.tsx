import React from 'react';
import type { ElectionNotice } from '../data/missions';
import { useScript } from '../lib/script';

export const ElectionNoticeLink: React.FC<{ notice?: ElectionNotice }> = ({ notice }) => {
  const { t } = useScript();
  if (!notice) return null;

  return (
    <div className="mission-detail" style={{ marginTop: '0.75rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <a
        href={notice.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
      >
        {t('Zvanično izborno obaveštenje')} ({notice.electionYear}) ↗
      </a>
      {notice.emailStatus === 'no-email-extracted' && (
        <span className="form-hint">
          {t('Za adresu i način predaje proverite obaveštenje i priloge.')}
        </span>
      )}
    </div>
  );
};
