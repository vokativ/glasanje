import React, { createContext, useContext, useMemo, useState } from 'react';

export type Script = 'cyrillic' | 'latin';

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

/** Converts Serbian Latin static text to Serbian Cyrillic without touching user-entered data. */
export const latinToCyrillic = (text: string): string =>
  text.replace(LATIN_SERBIAN_LETTERS, (letter) => LATIN_TO_CYRILLIC[letter]);

export const translateStaticText = (script: Script, latinText: string): string =>
  script === 'cyrillic' ? latinToCyrillic(latinText) : latinText;

export interface ScriptContextValue {
  script: Script;
  setScript: (script: Script) => void;
  t: (latinText: string) => string;
}

const defaultContext: ScriptContextValue = {
  script: 'cyrillic',
  setScript: () => undefined,
  t: latinToCyrillic,
};

const ScriptContext = createContext<ScriptContextValue>(defaultContext);

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

export const useScript = (): ScriptContextValue => useContext(ScriptContext);
