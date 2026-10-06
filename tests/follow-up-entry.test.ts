import { describe, expect, test } from 'bun:test';
import { FOLLOW_UP_ASSISTANTS, FOLLOW_UP_DETAILED_PROMPT } from '../src/lib/followUp';

describe('follow-up assistant entry', () => {

  test('supported query links round-trip the Cyrillic prompt while Gemini uses copy-and-open', () => {
    for (const assistant of FOLLOW_UP_ASSISTANTS) {
      const launchUrl = new URL(assistant.url);
      const promptParameter = assistant.id === 'gemini' ? null : 'q';

      if (promptParameter) {
        expect(launchUrl.searchParams.get(promptParameter)).toBe(FOLLOW_UP_DETAILED_PROMPT);
      } else {
        expect(launchUrl.search).toBe('');
      }
      expect(launchUrl.search).not.toContain('JMBG');
    }
  });
});
