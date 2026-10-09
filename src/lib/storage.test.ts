import { beforeEach, describe, expect, it } from 'vitest';
import { emptyForm } from '../domain/form';
import { clearDraft, loadDraft, loadPrefs, nextSequence, saveDraft, savePrefs } from './storage';

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

describe('counters', () => {
  it('counts per prefix and day, dropping old days', () => {
    expect(nextSequence('EST-20261004')).toBe(1);
    expect(nextSequence('EST-20261005')).toBe(1);
    expect(nextSequence('EST-20261005')).toBe(2);
    expect(nextSequence('INV-20261005')).toBe(1);
    expect(JSON.parse(memory.getItem('sosa.counters.v1') ?? '')).toEqual({
      'EST-20261005': 2,
      'INV-20261005': 1,
    });
  });

  it('restarts from corrupt data', () => {
    memory.setItem('sosa.counters.v1', JSON.stringify({ 'EST-20261005': -4 }));
    expect(nextSequence('EST-20261005')).toBe(1);
  });
});

describe('prefs', () => {
  it('defaults to 30 % and remembers the last deposit', () => {
    expect(loadPrefs()).toEqual({ depositPercent: '30' });
    savePrefs({ depositPercent: '20' });
    expect(loadPrefs()).toEqual({ depositPercent: '20' });
  });
});

describe('draft migration v1 → v2', () => {
  it('migrates an old draft: detail split out, new sections empty', () => {
    const v1 = {
      savedAt: 5,
      values: {
        ...emptyForm('estimate', 'EST-20261005-01', '2026-10-05', '30'),
        items: [
          {
            id: 'a',
            description: 'Refinish steps and handrails — 15 steps, 10 sticks',
            unit: 'lump sum',
            otherUnit: '',
            qty: '',
            unitPrice: '',
            lumpSum: '3000',
          },
        ],
        extrasOn: undefined,
        extras: undefined,
        processOn: undefined,
        processNote: undefined,
        steps: undefined,
      },
    };
    memory.setItem('sosa.draft.v1', JSON.stringify(v1));
    const draft = loadDraft();
    expect(draft?.values.items[0]).toMatchObject({
      description: 'Refinish steps and handrails',
      detail: '15 steps, 10 sticks',
    });
    expect(draft?.values).toMatchObject({ extrasOn: false, processOn: false, steps: [] });
    expect(memory.getItem('sosa.draft.v1')).toBeNull();
    expect(memory.getItem('sosa.draft.v2')).not.toBeNull();
  });
  it('drops an old draft that cannot be migrated, without throwing', () => {
    memory.setItem('sosa.draft.v1', JSON.stringify({ savedAt: 1, values: { type: 'receipt' } }));
    expect(loadDraft()).toBeNull();
    expect(memory.getItem('sosa.draft.v1')).toBeNull();
  });
});
