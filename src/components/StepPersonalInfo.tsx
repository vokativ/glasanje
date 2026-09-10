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
      ? 'За лакши контакт, препоручујемо цео међународни број који почиње знаком + (нпр. +49 151 12345678).'
      : undefined;

  const errors: Record<string, string | undefined> = {
    fullName: !data.fullName.trim() ? 'Име и презиме је обавезно' : undefined,
    placeOfBirth: !data.placeOfBirth.trim() ? 'Место рођења је обавезно' : undefined,
    jmbg: !jmbgValidation.valid ? jmbgValidation.error : undefined,
    serbianAddress: !data.serbianAddress.trim() ? 'Адреса у Србији је обавезна' : undefined,
    phone: !data.phone.trim() ? 'Контакт телефон је обавезан' : undefined,
    email: !data.email.trim()
      ? 'И-мејл адреса је обавезна'
      : !emailValid
        ? 'Унесите исправну и-мејл адресу'
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
      <h2 className="card-title">Корак 2: Лични подаци</h2>
      <p className="card-subtitle">
        Унесите ваше личне податке тачно онако како су уписани у вашем српском пасошу или личној карти.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="fullName">
            Име и презиме *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            spellCheck={false}
            className={`form-control ${touched.fullName && errors.fullName ? 'is-invalid' : ''}`}
            placeholder="нпр. Петар Петровић"
            value={data.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            required
          />
          <span className="form-hint">Унесите пуно име и презиме из пасоша</span>
          {touched.fullName && errors.fullName && (
            <span className="form-error">{errors.fullName}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="placeOfBirth">
            Место рођења *
          </label>
          <input
            id="placeOfBirth"
            name="placeOfBirth"
            type="text"
            autoComplete="off"
            className={`form-control ${touched.placeOfBirth && errors.placeOfBirth ? 'is-invalid' : ''}`}
            placeholder="нпр. Београд или Чачак"
            value={data.placeOfBirth}
            onChange={(e) => handleChange('placeOfBirth', e.target.value)}
            onBlur={() => handleBlur('placeOfBirth')}
            required
          />
          <span className="form-hint">Општина или град рођења као у пасошу</span>
          {touched.placeOfBirth && errors.placeOfBirth && (
            <span className="form-error">{errors.placeOfBirth}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="jmbg">
            Јединствени матични број грађана (ЈМБГ) *
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
            placeholder="13 цифара са личне карте / пасоша"
            value={data.jmbg}
            onChange={(e) => handleChange('jmbg', e.target.value.replace(/\D/g, ''))}
            onBlur={() => handleBlur('jmbg')}
            required
          />
          <div className="validation-trust">
            Провера се израчунава само локално, математичким контролним збиром (модул 11); не шаље се
            ниједном регистру и не доказује идентитет нити упис у бирачки списак.{' '}
            <a
              href="https://sr.wikipedia.org/wiki/Јединствени_матични_број_грађана"
              target="_blank"
              rel="noreferrer"
            >
              Сазнајте више о ЈМБГ-у
            </a>
            .
          </div>
          {touched.jmbg && errors.jmbg && <span className="form-error">{errors.jmbg}</span>}
          {touched.jmbg && !errors.jmbg && data.jmbg.length === 13 && (
            <span className="validation-status validation-status-success">
              ✓ Контролни збир ЈМБГ-а је исправан. Ово није потврда идентитета или регистрације
              бирача.
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="serbianAddress">
            Адреса пребивалишта у Републици Србији *
          </label>
          <input
            id="serbianAddress"
            name="serbianAddress"
            type="text"
            autoComplete="section-serbian street-address"
            className={`form-control ${touched.serbianAddress && errors.serbianAddress ? 'is-invalid' : ''}`}
            placeholder="нпр. Немањина 11, 11000 Београд"
            value={data.serbianAddress}
            onChange={(e) => handleChange('serbianAddress', e.target.value)}
            onBlur={() => handleBlur('serbianAddress')}
            required
          />
          <span className="form-hint">
            Адреса у Србији према којој сте уписани у бирачки списак (улица, број, место)
          </span>
          {touched.serbianAddress && errors.serbianAddress && (
            <span className="form-error">{errors.serbianAddress}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Адреса електронске поште (и-мејл) *
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
            Амбасада/конзулат ће вас контактирати преко овог и-мејла са потврдом
          </span>
          {touched.email && errors.email && (
            <span className="form-error">{errors.email}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">
            Контакт телефон *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={`form-control ${touched.phone && errors.phone ? 'is-invalid' : ''}`}
            placeholder="нпр. +65 9123 4567 или +49 151 12345678"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            required
          />
          <span className="form-hint">
            Унесите цео број на којем сте доступни, по могућству у међународном облику са знаком +.
            Број остаје независан од изабране земље.
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
            ← Назад
          </button>
          <button type="submit" className="btn btn-primary">
            Настави на избор места гласања →
          </button>
        </div>
      </form>
    </div>
  );
};
