import React, { useState } from 'react';
import { hasInternationalPhoneFormat, validateEmail, validateJmbg } from '../lib/validators';

export interface PersonalInfoData {
  fullName: string;
  placeOfBirth: string;
  jmbg: string;
  serbianAddress: string;
  phone: string;
  email: string;
}

interface StepPersonalInfoProps {
  initialData: PersonalInfoData;
  onBack: () => void;
  onNext: (data: PersonalInfoData) => void;
}

export const StepPersonalInfo: React.FC<StepPersonalInfoProps> = ({
  initialData,
  onBack,
  onNext,
}) => {
  const [data, setData] = useState<PersonalInfoData>(initialData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const jmbgValidation = validateJmbg(data.jmbg);
  const emailValid = validateEmail(data.email);
  const phoneFormatWarning =
    data.phone.trim() && !hasInternationalPhoneFormat(data.phone)
      ? 'Za lakši kontakt, preporučujemo ceo međunarodni broj koji počinje znakom + (npr. +49 151 12345678).'
      : undefined;

  const errors: Record<string, string | undefined> = {
    fullName: !data.fullName.trim() ? 'Ime i prezime je obavezno' : undefined,
    placeOfBirth: !data.placeOfBirth.trim() ? 'Mesto rođenja je obavezno' : undefined,
    jmbg: !jmbgValidation.valid ? jmbgValidation.error : undefined,
    serbianAddress: !data.serbianAddress.trim() ? 'Adresa u Srbiji je obavezna' : undefined,
    phone: !data.phone.trim() ? 'Kontakt telefon je obavezan' : undefined,
    email: !data.email.trim()
      ? 'I-mejl adresa je obavezna'
      : !emailValid
        ? 'Unesite ispravnu i-mejl adresu'
        : undefined,
  };

  const isFormValid = Object.values(errors).every((err) => err === undefined);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (field: keyof PersonalInfoData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onNext(data);
    } else {
      // Mark all fields as touched to show errors
      setTouched({
        fullName: true,
        placeOfBirth: true,
        jmbg: true,
        serbianAddress: true,
        phone: true,
        email: true,
      });
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Korak 2: Lični podaci</h2>
      <p className="card-subtitle">
        Unesite vaše lične podatke tačno onako kako su upisani u vašem srpskom pasošu ili ličnoj karti.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="fullName">
            Ime i prezime *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            spellCheck={false}
            className={`form-control ${touched.fullName && errors.fullName ? 'is-invalid' : ''}`}
            placeholder="npr. Petar Petrović"
            value={data.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            required
          />
          <span className="form-hint">Unesite puno ime i prezime iz pasoša</span>
          {touched.fullName && errors.fullName && (
            <span className="form-error">{errors.fullName}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="placeOfBirth">
            Mesto rođenja *
          </label>
          <input
            id="placeOfBirth"
            name="placeOfBirth"
            type="text"
            autoComplete="off"
            className={`form-control ${touched.placeOfBirth && errors.placeOfBirth ? 'is-invalid' : ''}`}
            placeholder="npr. Beograd ili Čačak"
            value={data.placeOfBirth}
            onChange={(e) => handleChange('placeOfBirth', e.target.value)}
            onBlur={() => handleBlur('placeOfBirth')}
            required
          />
          <span className="form-hint">Opština ili grad rođenja kao u pasošu</span>
          {touched.placeOfBirth && errors.placeOfBirth && (
            <span className="form-error">{errors.placeOfBirth}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="jmbg">
            Jedinstveni matični broj građana (JMBG) *
          </label>
          <input
            id="jmbg"
            name="jmbg"
            type="text"
            autoComplete="off"
            inputMode="numeric"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            maxLength={13}
            className={`form-control ${
              touched.jmbg
                ? errors.jmbg
                  ? 'is-invalid'
                  : 'is-valid'
                : ''
            }`}
            placeholder="13 cifara sa lične karte / pasoša"
            value={data.jmbg}
            onChange={(e) => handleChange('jmbg', e.target.value.replace(/\D/g, ''))}
            onBlur={() => handleBlur('jmbg')}
            required
          />
          <div className="validation-trust">
            Provera se izračunava samo lokalno, matematičkim kontrolnim zbirom (modul 11); ne šalje se
            nijednom registru i ne dokazuje identitet niti upis u birački spisak.{' '}
            <a
              href="https://sr.wikipedia.org/wiki/Јединствени_матични_број_грађана"
              target="_blank"
              rel="noreferrer"
            >
              Saznajte više o JMBG-u
            </a>
            .
          </div>
          {touched.jmbg && errors.jmbg && <span className="form-error">{errors.jmbg}</span>}
          {touched.jmbg && !errors.jmbg && data.jmbg.length === 13 && (
            <span className="validation-status validation-status-success">
              ✓ Kontrolni zbir JMBG-a je ispravan. Ovo nije potvrda identiteta ili registracije
              birača.
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="serbianAddress">
            Adresa prebivališta u Republici Srbiji *
          </label>
          <input
            id="serbianAddress"
            name="serbianAddress"
            type="text"
            autoComplete="section-serbian street-address"
            className={`form-control ${touched.serbianAddress && errors.serbianAddress ? 'is-invalid' : ''}`}
            placeholder="npr. Nemanjina 11, 11000 Beograd"
            value={data.serbianAddress}
            onChange={(e) => handleChange('serbianAddress', e.target.value)}
            onBlur={() => handleBlur('serbianAddress')}
            required
          />
          <span className="form-hint">
            Adresa u Srbiji prema kojoj ste upisani u birački spisak (ulica, broj, mesto)
          </span>
          {touched.serbianAddress && errors.serbianAddress && (
            <span className="form-error">{errors.serbianAddress}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Adresa elektronske pošte (i-mejl) *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`form-control ${touched.email && errors.email ? 'is-invalid' : ''}`}
            placeholder="vas.email@primer.com"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            required
          />
          <span className="form-hint">
            Ambasada/konzulat će vas kontaktirati preko ovog i-mejla sa potvrdom
          </span>
          {touched.email && errors.email && (
            <span className="form-error">{errors.email}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">
            Kontakt telefon *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={`form-control ${touched.phone && errors.phone ? 'is-invalid' : ''}`}
            placeholder="npr. +65 9123 4567 ili +49 151 12345678"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            required
          />
          <span className="form-hint">
            Unesite ceo broj na kojem ste dostupni, po mogućstvu u međunarodnom obliku sa znakom +.
            Broj ostaje nezavisan od izabrane zemlje.
          </span>
          {touched.phone && errors.phone && (
            <span className="form-error">{errors.phone}</span>
          )}
          {touched.phone && phoneFormatWarning && (
            <span className="form-warning">{phoneFormatWarning}</span>
          )}
        </div>

        <div className="btn-row">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            ← Nazad
          </button>
          <button type="submit" className="btn btn-primary">
            Nastavi na izbor mesta glasanja →
          </button>
        </div>
      </form>
    </div>
  );
};
