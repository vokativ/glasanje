/**
 * Validates Serbian JMBG (Jedinstveni matični broj građana)
 * using the official modulo 11 checksum algorithm.
 */
export function validateJmbg(jmbg: string): { valid: boolean; error?: string } {
  if (!jmbg) {
    return { valid: false, error: 'JMBG je obavezan' };
  }
  const clean = jmbg.trim();
  if (!/^\d{13}$/.test(clean)) {
    return { valid: false, error: 'JMBG mora sadržati tačno 13 cifara' };
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
    return { valid: false, error: 'Neispravan kontrolni broj JMBG-a' };
  }

  if (checkDigit !== d[12]) {
    return { valid: false, error: 'Kontrolna cifra JMBG-a se ne poklapa' };
  }

  return { valid: true };
}

/**
 * Checks whether a non-empty phone number resembles a full international number.
 * This is advisory only: a number is never rejected based on country or residence.
 */
export function hasInternationalPhoneFormat(phone: string): boolean {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  return /^\+[\d\s().-]+$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}

/** Validates email address format. */
export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email.trim());
}

/** Formats current date in DD.MM.YYYY format. */
export function formatSerbianDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}.`;
}
