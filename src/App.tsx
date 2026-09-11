import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Header } from './components/Header';
import { getElectionEmailCoverage, RegistrationEmailStatusPage } from './components/RegistrationEmailStatusPage';
import { Countdown } from './components/Countdown';
import { StepVoterRegistry } from './components/StepVoterRegistry';
import { StepPersonalInfo, PersonalInfoData } from './components/StepPersonalInfo';
import { StepVotingDestination, VotingDestinationData } from './components/StepVotingDestination';
import type { SignatureAndDocumentData } from './components/StepSignatureAndDocument';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { COUNTRY_BY_CODE } from './data/missions';
import { getOfflineSnapshot, retryOfflinePreparation, subscribeOffline } from './lib/offline';
import type { ApplicationFormData } from './lib/pdf';
import { getInitialDesiredLocation } from './lib/invite';
import { ScriptProvider, useScript } from './lib/script';
import { formatSerbianDate } from './lib/validators';

const StepSignatureAndDocument = React.lazy(() =>
  import('./components/StepSignatureAndDocument').then(({ StepSignatureAndDocument }) => ({
    default: StepSignatureAndDocument,
  }))
);

const StepExportAndSubmit = React.lazy(() =>
  import('./components/StepExportAndSubmit').then(({ StepExportAndSubmit }) => ({
    default: StepExportAndSubmit,
  }))
);

const getInitialCountryCode = (): string => {
  if (typeof window === 'undefined') return '';

  const countryParameters = new URLSearchParams(window.location.search).getAll('country');
  if (countryParameters.length !== 1) return '';

  const countryCode = countryParameters[0].trim().toUpperCase();
  return COUNTRY_BY_CODE.has(countryCode) ? countryCode : '';
};

const getInitialDesiredLocationFromUrl = (): string =>
  typeof window === 'undefined' ? '' : getInitialDesiredLocation(window.location.search);


type AppRoute = 'form' | 'status';

const STEPS = [
  { id: 1, label: 'Provera' },
  { id: 2, label: 'Podaci' },
  { id: 3, label: 'Mesto' },
  { id: 4, label: 'Potpis' },
  { id: 5, label: 'Slanje' },
];

const AppContent: React.FC = () => {
  const { script, t } = useScript();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' && window.location.pathname === '/status' ? 'status' : 'form',
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const offlineSnapshot = useSyncExternalStore(
    subscribeOffline,
    getOfflineSnapshot,
    getOfflineSnapshot,
  );
  const isStatusPage = route === 'status';
  const emailCoverage = useMemo(
    () => getElectionEmailCoverage(undefined, currentTime),
    [currentTime],
  );

  // Form state
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({
    fullName: '',
    parentName: '',
    jmbg: '',
    serbianAddress: '',
    phone: '',
    email: '',
  });

  const [votingDestination, setVotingDestination] = useState<VotingDestinationData>(() => ({
    countryCode: getInitialCountryCode(),
    stationId: null,
    foreignAddress: '',
    desiredLocation: getInitialDesiredLocationFromUrl(),
  }));

  const [signatureAndDoc, setSignatureAndDoc] = useState<SignatureAndDocumentData>({
    signaturePngDataUrl: '',
    isWetInkSignature: false,
  });
  const [idDocumentDataUrl, setIdDocumentDataUrl] = useState<string | undefined>();

  const handleStep1Complete = () => {
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: PersonalInfoData) => {
    setPersonalInfo(data);
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: VotingDestinationData) => {
    setVotingDestination(data);
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: SignatureAndDocumentData) => {
    setSignatureAndDoc(data);
    setCurrentStep(5);
  };

  const handleReset = () => {
    if (window.confirm(t('Da li ste sigurni da želite da započnete novu prijavu?'))) {
      setCurrentStep(1);
      setPersonalInfo({
        fullName: '',
        parentName: '',
        jmbg: '',
        serbianAddress: '',
        phone: '',
        email: '',
      });
      setSignatureAndDoc({
        signaturePngDataUrl: '',
        isWetInkSignature: false,
      });
      setIdDocumentDataUrl(undefined);
      setVotingDestination({
        countryCode: '',
        stationId: null,
        foreignAddress: '',
        desiredLocation: '',
      });
    }
  };

  const navigateToStatus = () => {
    window.history.pushState({ glasanjeRoute: 'status' }, '', '/status');
    setRoute('status');
  };

  const navigateToForm = () => {
    if (window.history.state?.glasanjeRoute === 'status') {
      window.history.back();
      return;
    }

    window.history.replaceState(null, '', '/');
    setRoute('form');
  };

  const startApplicationForCountry = (countryCode: string) => {
    const country = COUNTRY_BY_CODE.get(countryCode);
    if (!country) return;

    setVotingDestination((previous) => ({
      ...previous,
      countryCode,
      stationId: country.stations[0]?.id ?? null,
    }));
    setCurrentStep(1);
    navigateToForm();
  };

  const currentCountry = COUNTRY_BY_CODE.get(votingDestination.countryCode);
  const currentStation = votingDestination.stationId
    ? currentCountry?.stations.find((station) => station.id === votingDestination.stationId) ?? null
    : null;
  const countryDisplayName =
    script === 'cyrillic' ? currentCountry?.labelCyr ?? '' : currentCountry?.label ?? '';
  const countryNameCyr = currentCountry?.labelCyr ?? '';

  // Compile full application data for PDF generator. A station must be resolved before export renders.
  const compiledApplicationData: ApplicationFormData = {
    fullName: personalInfo.fullName,
    parentName: personalInfo.parentName,
    jmbg: personalInfo.jmbg,
    serbianAddress: personalInfo.serbianAddress,
    foreignAddress: votingDestination.foreignAddress,
    stationName: currentStation?.embassyCyr ?? '',
    desiredLocation: votingDestination.desiredLocation,
    signingDate: formatSerbianDate(),
    phone: personalInfo.phone,
    email: personalInfo.email,
    signatureMode: signatureAndDoc.isWetInkSignature ? 'wet-ink' : 'screen',
    signaturePngDataUrl: signatureAndDoc.signaturePngDataUrl,
    idDocumentDataUrl,
  };

  useEffect(() => {
    document.documentElement.lang = script === 'cyrillic' ? 'sr-Cyrl' : 'sr-Latn';
    document.title = t(
      isStatusPage
        ? 'Status izbornih i-mejl adresa | Korak do glasa'
        : 'Korak do glasa | Prijava za glasanje iz inostranstva',
    );
  }, [isStatusPage, script, t]);

  useEffect(() => {
    const updateRoute = () =>
      setRoute(window.location.pathname === '/status' ? 'status' : 'form');
    window.addEventListener('popstate', updateRoute);
    return () => window.removeEventListener('popstate', updateRoute);
  }, []);

  useEffect(() => {
    const refreshCurrentTime = () => setCurrentTime(Date.now());
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentTime();
      }
    };

    window.addEventListener('focus', refreshCurrentTime);
    window.addEventListener('pageshow', refreshCurrentTime);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshCurrentTime);
      window.removeEventListener('pageshow', refreshCurrentTime);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);
  const activeStep = STEPS[currentStep - 1];


  return (
    <div className="container">
      <Header onOpenPrivacy={() => setIsPrivacyOpen(true)} />
      <div role="status" aria-live="polite" className="form-hint" style={{ marginBottom: '1.25rem' }}>
        {offlineSnapshot.updateAvailable ? (
          <>
            <p>{t('Postoji novija verzija alata.')}</p>
            <p>{t('Da biste je bezbedno preuzeli, završite ili zapišite prijavu, zatvorite sve kartice ovog alata, pa ga ponovo otvorite. Uneti podaci se ne čuvaju u pregledaču.')}</p>
          </>
        ) : offlineSnapshot.status === 'preparing' ? (
          <p>{t('Priprema za rad bez interneta…')}</p>
        ) : offlineSnapshot.status === 'ready' ? (
          <>
            <p>{t('Spremno za rad bez interneta na ovom uređaju.')}</p>
            <p>{t('Prikazani podaci su od poslednjeg povezivanja.')}</p>
          </>
        ) : offlineSnapshot.status === 'unsupported' ? (
          <p>{t('Ovaj pregledač ne čuva alat za rad bez interneta. Obrada podataka i dalje ostaje na vašem uređaju.')}</p>
        ) : (
          <>
            <p>{t('Rad bez interneta nije spreman. Ostanite povezani dok se priprema ne završi.')}</p>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => void retryOfflinePreparation()}
            >
              {t('Pokušaj ponovo pripremu za rad bez interneta')}
            </button>
          </>
        )}
      </div>
      {isStatusPage ? (
        <RegistrationEmailStatusPage
          now={currentTime}
          onBack={navigateToForm}
          onStart={startApplicationForCountry}
        />
      ) : (
        <>
          <Countdown />
          <a
            href="/status"
            className="btn btn-sm btn-navy"
            onClick={(event) => {
              event.preventDefault();
              navigateToStatus();
            }}
            style={{
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{t('Status izbornih i-mejl adresa')}</span>
            <strong>{emailCoverage.confirmed}/{emailCoverage.total}</strong>
            <span aria-hidden="true">→</span>
          </a>


          {/* Stepper Navigation */}
          <div className="stepper-context">
            <nav className="stepper-nav" aria-label={t('Faze popunjavanja')}>
              {STEPS.map((s) => {
                const isCompleted = s.id < currentStep;
                const isActive = s.id === currentStep;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`step-indicator ${isActive ? 'active' : ''} ${
                      isCompleted ? 'completed' : ''
                    }`}
                    onClick={() => {
                      if (s.id < currentStep) {
                        setCurrentStep(s.id);
                      }
                    }}
                    disabled={s.id > currentStep}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="step-dot">{isCompleted ? '✓' : s.id}</div>
                    <div className="step-label">{t(s.label)}</div>
                  </button>
                );
              })}
            </nav>
            <p className="current-step-context" aria-live="polite">
              {t('Korak')} {currentStep} {t('od')} {STEPS.length}: <strong>{t(activeStep.label)}</strong>
            </p>
          </div>

          <main>
            {currentStep === 1 && <StepVoterRegistry onProceed={handleStep1Complete} />}

            {currentStep === 2 && (
              <StepPersonalInfo
                initialData={personalInfo}
                onDraftChange={setPersonalInfo}
                onBack={() => setCurrentStep(1)}
                onNext={handleStep2Complete}
              />
            )}

            {currentStep === 3 && (
              <StepVotingDestination
                initialData={votingDestination}
                now={currentTime}
                onDraftChange={setVotingDestination}
                onBack={() => setCurrentStep(2)}
                onNext={handleStep3Complete}
              />
            )}

            {currentStep === 4 && (
              <React.Suspense fallback={<p aria-live="polite">{t('Učitavanje potpisa i dokumenta…')}</p>}>
                <StepSignatureAndDocument
                  initialData={signatureAndDoc}
                  idDocumentDataUrl={idDocumentDataUrl}
                  onIdDocumentChange={setIdDocumentDataUrl}
                  onBack={() => setCurrentStep(3)}
                  onNext={handleStep4Complete}
                />
              </React.Suspense>
            )}

            {currentStep === 5 && currentStation && (
              <React.Suspense fallback={<p aria-live="polite">{t('Učitavanje izvoza prijave…')}</p>}>
                <StepExportAndSubmit
                  formData={compiledApplicationData}
                  station={currentStation}
                  countryName={countryDisplayName}
                  countryNameCyr={countryNameCyr}
                  isWetInkSignature={signatureAndDoc.isWetInkSignature}
                  onBack={() => setCurrentStep(4)}
                  onEditStep={setCurrentStep}
                  onReset={handleReset}
                />
              </React.Suspense>
            )}
          </main>
        </>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', margin: '2rem 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        <p>
          {t('Ovaj sajt je nezavisan volonterski alat za građane Srbije u dijaspori. ')}
          <button
            type="button"
            onClick={() => setIsPrivacyOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {t('Politika privatnosti')}
          </button>
        </p>
        <p style={{ marginTop: '0.35rem' }}>
          {t('Izvorni kod je otvoren i dostupan na ')}
          <a
            href="https://github.com/vokativ/glasanje"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('GitHub-u')}
          </a>
          .
        </p>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => (
  <ScriptProvider>
    <AppContent />
  </ScriptProvider>
);

export default App;
