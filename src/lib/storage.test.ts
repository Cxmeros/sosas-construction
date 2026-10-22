import { beforeEach, describe, expect, it } from 'vitest';
import { emptyForm } from '../domain/form';
import { clearDraft, loadDraft, loadPrefs, saveDraft, savePrefs } from './storage';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let memory: MemoryStorage;
beforeEach(() => {
  memory = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: memory },
    configurable: true,
  });
});

describe('draft', () => {
  it('round-trips', () => {
    const values = emptyForm('estimate', 'EST-20261005-01', '2026-10-05', '30');
    saveDraft(values, 123);
    expect(loadDraft()).toEqual({ savedAt: 123, values });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('discards corrupt JSON and invalid shapes', () => {
    memory.setItem('sosa.draft.v2', '{not json');
    expect(loadDraft()).toBeNull();
    memory.setItem('sosa.draft.v2', JSON.stringify({ savedAt: 1, values: { type: 'receipt' } }));
    expect(loadDraft()).toBeNull();
    expect(memory.getItem('sosa.draft.v2')).toBeNull();
  });

  it('survives storage that throws', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        get localStorage(): never {
          throw new Error('blocked');
        },
      },
      configurable: true,
    });
    expect(loadDraft()).toBeNull();
    expect(() => {
      saveDraft(emptyForm('invoice', 'X', '2026-10-05', '30'));
    }).not.toThrow();
  });
});

describe('old keys', () => {
  it('drops the per-device counter and the hand-typed numbers queue on startup', () => {
    memory.setItem('sosa.counters.v1', JSON.stringify({ 'EST-20261005': 2 }));
    memory.setItem('sosa.pending.v1', JSON.stringify(['EST-261021-04']));
    loadDraft();
    expect(memory.getItem('sosa.counters.v1')).toBeNull();
    expect(memory.getItem('sosa.pending.v1')).toBeNull();
  });
});

describe('prefs', () => {
  it('defaults to 30 % and remembers the last deposit', () => {
    expect(loadPrefs()).toEqual({ depositPercent: '30' });
    savePrefs({ depositPercent: '20' });
    expect(loadPrefs()).toEqual({ depositPercent: '20' });
  });
});
