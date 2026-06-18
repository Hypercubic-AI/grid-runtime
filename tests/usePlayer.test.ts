import { describe, it, expect } from 'vitest';
import { clampIndex, fpsForSpeed } from '@/hooks/usePlayer';

describe('clampIndex', () => {
  it('clamps into [0, total-1]', () => {
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(99, 5)).toBe(4);
    expect(clampIndex(2, 5)).toBe(2);
  });
  it('is 0 for an empty timeline', () => {
    expect(clampIndex(0, 0)).toBe(0);
  });
});

describe('fpsForSpeed', () => {
  it('scales the base frame rate by the multiplier', () => {
    expect(fpsForSpeed(1)).toBe(14);
    expect(fpsForSpeed(2)).toBe(28);
    expect(fpsForSpeed(0.5)).toBe(7);
  });
});
