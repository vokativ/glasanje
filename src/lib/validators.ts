import { type Script, translateStaticText } from './script';

/**
 * Local, format-level checks for form fields. They neither transmit values nor
 * establish a person's identity, eligibility, residence, or the current
 * acceptability of an external recipient.
 */

/**
 * Validates the 13-digit JMBG checksum locally using modulo 11. A valid result
 * only detects this structural consistency condition; it is not verification
 * of the identifier or of the person it names.
 */

export function validateJmbg(
  jmbg: string,
  script: Script = 'cyrillic',
): { valid: boolean; error?: string } {
  if (!jmbg) {
    return { valid: false, error: translateStaticText(script, 'JMBG je obavezan') };
  }
  const clean = jmbg.trim();
  if (!/^\d{13}$/.test(clean)) {
    return {
      valid: false,
      error: translateStaticText(script, 'JMBG mora sadržati tačno 13 cifara'),
    };
  }

  const d = clean.split('').map(Number);
  const sum =
    7 * (d[0] + d[6]) +
    6 * (d[1] + d[7]) +
    5 * (d[2] + d[8]) +
    4 * (d[3] + d[9]) +
    3 * (d[4] + d[10]) +
    2 * (d[5] + d[11]);

  const mod = sum % 11;
  let checkDigit = 11 - mod;
  if (checkDigit === 11) checkDigit = 0;
  if (checkDigit === 10) {
    return {
      valid: false,
      error: translateStaticText(script, 'Neispravan kontrolni broj JMBG-a'),
    };
  }

  if (checkDigit !== d[12]) {
    return {
      valid: false,
      error: translateStaticText(script, 'Kontrolna cifra JMBG-a se ne poklapa'),
    };
  }

  return { valid: true };
}

/**
 * Checks whether a non-empty phone value resembles an international number.
 * This is deliberately advisory: country codes and residence are not inferred
 * or rejected, and no number is sent during the check.
 */

export function hasInternationalPhoneFormat(phone: string): boolean {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  return /^\+[\d\s().-]+$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}

/**
 * Applies a lightweight local syntax check, not mailbox existence or ownership
 * verification. Delivery remains the responsibility of the chosen mail path.
 */

export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email.trim());
}

/** Formats a local calendar date for the PDF's Serbian date field; no timezone conversion is applied. */

export function formatSerbianDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}.`;
}
