import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Provides a presentation-only Serbian script preference. Transliteration is
 * deliberately limited to application-owned static Latin text: names,
 * addresses, identifiers, and other user-entered values must pass through
 * unchanged so their supplied spelling is preserved.
 */

export type Script = 'cyrillic' | 'latin';

// Internal page links carry an explicit Latin choice across a full navigation.
// No browser storage or applicant data is needed; absent/ambiguous hints use Cyrillic.
export const getInitialScript = (search: string): Script => {
  const values = new URLSearchParams(search).getAll('script');
  return values.length === 1 && values[0] === 'latin' ? 'latin' : 'cyrillic';
};

// Long digraphs precede single letters so DŽ, LJ, and NJ remain one Serbian character.

const LATIN_TO_CYRILLIC: Record<string, string> = {
  DŽ: 'Џ',
  Dž: 'Џ',
  dž: 'џ',
  LJ: 'Љ',
  Lj: 'Љ',
  lj: 'љ',
  NJ: 'Њ',
  Nj: 'Њ',
  nj: 'њ',
  A: 'А',
  a: 'а',
  B: 'Б',
  b: 'б',
  C: 'Ц',
  c: 'ц',
  Č: 'Ч',
  č: 'ч',
  Ć: 'Ћ',
  ć: 'ћ',
  D: 'Д',
  d: 'д',
  Đ: 'Ђ',
  đ: 'ђ',
  E: 'Е',
  e: 'е',
  F: 'Ф',
  f: 'ф',
  G: 'Г',
  g: 'г',
  H: 'Х',
  h: 'х',
  I: 'И',
  i: 'и',
  J: 'Ј',
  j: 'ј',
  K: 'К',
  k: 'к',
  L: 'Л',
  l: 'л',
  M: 'М',
  m: 'м',
  N: 'Н',
  n: 'н',
  O: 'О',
  o: 'о',
  P: 'П',
  p: 'п',
  R: 'Р',
  r: 'р',
  S: 'С',
  s: 'с',
  Š: 'Ш',
  š: 'ш',
  T: 'Т',
  t: 'т',
  U: 'У',
  u: 'у',
  V: 'В',
  v: 'в',
  Z: 'З',
  z: 'з',
  Ž: 'Ж',
  ž: 'ж',
};

const LATIN_SERBIAN_LETTERS =
  /DŽ|Dž|dž|LJ|Lj|lj|NJ|Nj|nj|[ABCČĆDĐEFGHIJKLMNOPRSTUVZŠŽabcčćdđefghijklmnoprstuvzšž]/g;

/**
 * Converts only recognized Serbian Latin letters in static copy. Characters
 * outside the table are retained, so this is not general language translation
 * or a safe transform for personal data.
 */
export const latinToCyrillic = (text: string): string =>
  text.replace(LATIN_SERBIAN_LETTERS, (letter) => LATIN_TO_CYRILLIC[letter]);

/**
 * Selects the static-copy representation; callers retain responsibility for
 * keeping user-provided values outside this formatter.
 */

export const translateStaticText = (script: Script, latinText: string): string =>
  script === 'cyrillic' ? latinToCyrillic(latinText) : latinText;

export interface ScriptContextValue {
  script: Script;
  setScript: (script: Script) => void;
  t: (latinText: string) => string;
}

// A consumer rendered outside the provider still has readable Cyrillic copy;
// its setter is intentionally inert because there is no shared UI state.

const defaultContext: ScriptContextValue = {
  script: 'cyrillic',
  setScript: () => undefined,
  t: latinToCyrillic,
};

const ScriptContext = createContext<ScriptContextValue>(defaultContext);

/** Initial preference affects this provider instance only and is not persisted. */

export interface ScriptProviderProps extends React.PropsWithChildren {
  initialScript?: Script;
}

export const ScriptProvider: React.FC<ScriptProviderProps> = ({
  children,
  initialScript = 'cyrillic',
}) => {
  const [script, setScript] = useState<Script>(initialScript);
  const value = useMemo<ScriptContextValue>(
    () => ({
      script,
      setScript,
      t: (latinText) => translateStaticText(script, latinText),
    }),
    [script],
  );

  return React.createElement(ScriptContext.Provider, { value }, children);
};

/** Reads the nearest script preference; no provider yields the safe default above. */

export const useScript = (): ScriptContextValue => useContext(ScriptContext);
