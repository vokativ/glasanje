import { expect, test } from 'bun:test';
import { copyTextToClipboard } from '../src/lib/share';

for (const result of ['copied', 'denied', 'throws'] as const) {
  test(`legacy clipboard ${result} restores focus and removes its temporary field`, async () => {
    const originals = Object.fromEntries(['navigator', 'document', 'HTMLElement'].map((key) =>
      [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ));
    let active: Focusable;
    let fieldAttached = false;
    class Focusable {
      value = '';
      style = { position: '', opacity: '' };
      focus() { active = this; }
      select() {}
      remove() { fieldAttached = false; }
    }
    const trigger = new Focusable();
    active = trigger;
    const document = {
      get activeElement() { return active; },
      createElement: () => new Focusable(),
      body: { appendChild: () => { fieldAttached = true; } },
      execCommand: () => {
        if (result === 'throws') throw new Error('Copy blocked');
        return result === 'copied';
      },
    };
    try {
      Object.defineProperties(globalThis, {
        navigator: { configurable: true, value: { clipboard: { writeText: async () => { throw new Error('Clipboard denied'); } } } },
        document: { configurable: true, value: document },
        HTMLElement: { configurable: true, value: Focusable },
      });
      expect(await copyTextToClipboard('Public follow-up text')).toBe(result === 'copied');
      expect(active).toBe(trigger);
      expect(fieldAttached).toBe(false);
    } finally {
      for (const key of ['navigator', 'document', 'HTMLElement']) {
        const descriptor = originals[key];
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });
}
