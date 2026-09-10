import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Countdown } from './components/Countdown';
import { StepVoterRegistry } from './components/StepVoterRegistry';
import { StepPersonalInfo, PersonalInfoData } from './components/StepPersonalInfo';
import { StepVotingDestination, VotingDestinationData } from './components/StepVotingDestination';
import type { SignatureAndDocumentData } from './components/StepSignatureAndDocument';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { COUNTRY_BY_CODE } from './data/missions';
import { ApplicationFormData } from './lib/pdf';
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

  // Form state
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({
    fullName: '',
    placeOfBirth: '',
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
    idDocumentDataUrl: undefined,
  });

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
        placeOfBirth: '',
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
    placeOfBirth: personalInfo.placeOfBirth,
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
    document.title = t('Korak do glasa | Prijava za glasanje iz inostranstva');
  }, [script, t]);

  return (
    <div className="container">
      <Header onOpenPrivacy={() => setIsPrivacyOpen(true)} />
      <Countdown />

      {/* Stepper Navigation */}
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
                // Allow clicking back to completed steps
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

      {/* Step Views */}
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
