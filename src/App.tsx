/**
 * Browser-only application shell for the registration wizard. It owns each
 * in-progress application only in React state: nothing here persists personal
 * details, signatures, or documents beyond the open page, and reset must clear
 * every step's data together.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { getElectionEmailCoverage, RegistrationEmailStatusPage } from './components/RegistrationEmailStatusPage';
import { Countdown } from './components/Countdown';
import { StepVoterRegistry } from './components/StepVoterRegistry';
import { StepPersonalInfo, PersonalInfoData } from './components/StepPersonalInfo';
import {
  getVotingDestinationCoverage,
  StepVotingDestination,
  VotingDestinationData,
} from './components/StepVotingDestination';
import type { SignatureAndDocumentData } from './components/StepSignatureAndDocument';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { COUNTRY_BY_CODE } from './data/missions';
import { ApplicationFormData } from './lib/pdf';
import { getInitialDesiredLocation } from './lib/invite';
import { ScriptProvider, useScript } from './lib/script';
import { formatSerbianDate } from './lib/validators';

// Canvas and PDF/export code is deferred until its later wizard step so the
// initial eligibility check does not load those browser-heavy dependencies.
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

// URL values are hints for the first render, not retained wizard state. Accept
// exactly one recognised country code to avoid treating ambiguous links as data.
const getInitialCountryCode = (): string => {
  if (typeof window === 'undefined') return '';

  const countryParameters = new URLSearchParams(window.location.search).getAll('country');
  if (countryParameters.length !== 1) return '';

  const countryCode = countryParameters[0].trim().toUpperCase();
  return COUNTRY_BY_CODE.has(countryCode) ? countryCode : '';
};

// Keep desired-location parsing at the browser boundary; server rendering has
// no location search string to resolve.
const getInitialDesiredLocationFromUrl = (): string =>
  typeof window === 'undefined' ? '' : getInitialDesiredLocation(window.location.search);

const STEPS = [
  { id: 1, label: 'Provera' },
  { id: 2, label: 'Podaci' },
  { id: 3, label: 'Mesto' },
  { id: 4, label: 'Potpis' },
  { id: 5, label: 'Slanje' },
];

const AppContent: React.FC = () => {
  const { script, t } = useScript();
  const [initialCountryCode] = useState(getInitialCountryCode);
  const [currentStep, setCurrentStep] = useState<number>(() => initialCountryCode ? 2 : 1);
  const [registryStepCompleted, setRegistryStepCompleted] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  // This intentionally small route split avoids a routing dependency for the
  // standalone status surface; all other paths stay in the registration flow.
  const isStatusPage = typeof window !== 'undefined' && window.location.pathname === '/status';
  const emailCoverage = useMemo(() => getElectionEmailCoverage(), []);
  const votingDestinationCoverage = useMemo(() => getVotingDestinationCoverage(), []);


  // The shell, rather than individual steps, owns data that must survive
  // back-navigation. Sensitive fields remain memory-only until the user exports.
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
    countryCode: initialCountryCode,
    stationId: null,
    foreignAddress: '',
    desiredLocation: getInitialDesiredLocationFromUrl(),
  }));

  const [signatureAndDoc, setSignatureAndDoc] = useState<SignatureAndDocumentData>({
    signaturePngDataUrl: '',
    isWetInkSignature: false,
    idDocumentDataUrl: undefined,
  });

  const handleStep1Complete = () => {
    setRegistryStepCompleted(true);
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

  // Reset is an ownership boundary: confirmation only authorizes discarding the
  // current in-memory application; it does not attest to any prior submission.
  const handleReset = () => {
    if (window.confirm(t('Da li ste sigurni da želite da započnete novu prijavu?'))) {
      setCurrentStep(1);
      setRegistryStepCompleted(false);
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
        idDocumentDataUrl: undefined,
      });
      setVotingDestination({
        countryCode: '',
        stationId: null,
        foreignAddress: '',
        desiredLocation: '',
      });
    }
  };

  // Resolve the selected station from the current country on each render rather
  // than storing a duplicate object that could become inconsistent with its ID.
  const currentCountry = COUNTRY_BY_CODE.get(votingDestination.countryCode);
  const currentStation = votingDestination.stationId
    ? currentCountry?.stations.find((station) => station.id === votingDestination.stationId) ?? null
    : null;
  const countryDisplayName =
    script === 'cyrillic' ? currentCountry?.labelCyr ?? '' : currentCountry?.label ?? '';
  const countryNameCyr = currentCountry?.labelCyr ?? '';

  // Compile the export model only after its dependent station has been resolved;
  // the final step remains unavailable when that relationship is invalid.
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
    signaturePngDataUrl: signatureAndDoc.signaturePngDataUrl,
    idDocumentDataUrl: signatureAndDoc.idDocumentDataUrl,
  };

  useEffect(() => {
    document.documentElement.lang = script === 'cyrillic' ? 'sr-Cyrl' : 'sr-Latn';
    document.title = t(
      isStatusPage
        ? 'Status izbornih i-mejl adresa | Korak do glasa'
        : 'Korak do glasa | Prijava za glasanje iz inostranstva',
    );
  }, [isStatusPage, script, t]);
  const activeStep = STEPS[currentStep - 1];


  return (
    <div className="container">
      <Header onOpenPrivacy={() => setIsPrivacyOpen(true)} />
      {isStatusPage ? (
        <RegistrationEmailStatusPage />
      ) : (
        <>
          <Countdown />
          <a
            href="/status"
            className="btn btn-sm btn-navy"
            style={{
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{t('Status izbornih i-mejl adresa')}</span>
            <strong>{emailCoverage.approved}/{emailCoverage.total}</strong>
            <span aria-hidden="true">→</span>
          </a>


          {/* Stepper Navigation */}
          <div className="stepper-context">
            <nav className="stepper-nav" aria-label={t('Faze popunjavanja')}>
              {STEPS.map((s) => {
                // A country link skips the registry screen; it does not attest
                // that the user checked their entry in the voter register.
                const isCompleted = s.id < currentStep && (s.id !== 1 || registryStepCompleted);
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
                onBack={() => setCurrentStep(1)}
                onNext={handleStep2Complete}
              />
            )}

            {currentStep === 3 && (
              <StepVotingDestination
                initialData={votingDestination}
                coverage={votingDestinationCoverage}
                onBack={() => setCurrentStep(2)}
                onNext={handleStep3Complete}
              />
            )}

            {currentStep === 4 && (
              <React.Suspense fallback={<p aria-live="polite">{t('Učitavanje potpisa i dokumenta…')}</p>}>
                <StepSignatureAndDocument
                  initialData={signatureAndDoc}
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
