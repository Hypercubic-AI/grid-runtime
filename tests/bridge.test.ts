import { describe, it, expect } from 'vitest';
import { normalizeDirectionsFile } from '@/lib/bridge';

describe('normalizeDirectionsFile', () => {
  it('accepts a bare instruction list', () => {
    const r = normalizeDirectionsFile({ instructions: [{ op: 'ARRIVE' }] });
    expect(r.directions?.instructions.length).toBe(1);
    expect(r.scenario).toBeNull();
  });

  it('accepts the nested directions + scenario shape', () => {
    const r = normalizeDirectionsFile({
      directions: { instructions: [] },
      scenario: { world: 'downtown', start: { cell: [0, 0], facing: 'E' }, expected: { cell: [2, 0], facing: 'E' } },
    });
    expect(r.directions).not.toBeNull();
    expect(r.scenario?.world).toBe('downtown');
    expect(r.scenario?.expected?.cell).toEqual([2, 0]);
  });

  it('returns null directions for malformed input', () => {
    expect(normalizeDirectionsFile({ scenario: {} }).directions).toBeNull();
    expect(normalizeDirectionsFile(null).directions).toBeNull();
    expect(normalizeDirectionsFile({ directions: [1, 2, 3] }).directions).toBeNull();
    expect(normalizeDirectionsFile('nonsense').directions).toBeNull();
  });
});
