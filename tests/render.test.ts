import { describe, it, expect } from 'vitest';
import { sx, sy, CELL, nearestEquivalentAngle } from '@/lib/render';
import { groupRuns } from '@/lib/render';

describe('render coordinates', () => {
  it('sx maps grid x to screen x', () => {
    expect(sx(3)).toBe(3 * CELL);
  });

  it('sy flips so grid-North maps to a smaller (higher) screen y', () => {
    const H = 41;
    expect(sy(H, 0)).toBe((H - 1) * CELL); // y=0 (south) sits at the bottom
    expect(sy(H, H - 1)).toBe(0); // northmost row sits at the top
    expect(sy(H, 1)).toBeLessThan(sy(H, 0)); // moving North moves up the screen
  });
});

describe('nearestEquivalentAngle', () => {
  it('rotates the short way across the 0/360 wrap', () => {
    expect(nearestEquivalentAngle(270, 0)).toBe(360); // W->N: +90, not -270
    expect(nearestEquivalentAngle(0, 270)).toBe(-90); // N->W: -90, not +270
    expect(nearestEquivalentAngle(90, 180)).toBe(180); // E->S: +90
    expect(nearestEquivalentAngle(0, 0)).toBe(0); // no change
  });

  it('accumulates so repeated same-direction turns keep winding monotonically', () => {
    let a = 0; // facing N
    a = nearestEquivalentAngle(a, 90); // -> E
    a = nearestEquivalentAngle(a, 180); // -> S
    a = nearestEquivalentAngle(a, 270); // -> W
    a = nearestEquivalentAngle(a, 0); // -> N (wrap)
    expect(a).toBe(360); // four right turns = one full clockwise revolution
  });
});

describe('groupRuns', () => {
  it('groups a horizontal run (downtown construction)', () => {
    const runs = groupRuns([[35, 20], [36, 20], [37, 20]]);
    expect(runs).toHaveLength(1);
    expect(runs[0].orient).toBe('h');
    expect(runs[0].cells).toEqual([[35, 20], [36, 20], [37, 20]]);
  });
  it('groups a vertical run and orders it ascending', () => {
    const runs = groupRuns([[50, 32], [50, 30], [50, 31]]);
    expect(runs).toHaveLength(1);
    expect(runs[0].orient).toBe('v');
    expect(runs[0].cells).toEqual([[50, 30], [50, 31], [50, 32]]);
  });
  it('treats an isolated cell as a point and separates disjoint runs', () => {
    const runs = groupRuns([[3, 0], [10, 5], [11, 5]]);
    expect(runs).toHaveLength(2);
    expect(runs.find((r) => r.orient === 'point')?.cells).toEqual([[3, 0]]);
    expect(runs.find((r) => r.orient === 'h')?.cells).toEqual([[10, 5], [11, 5]]);
  });
});
