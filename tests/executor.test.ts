import { describe, it, expect } from 'vitest';
import { execute } from '@/lib/executor';
import type { World, Directions } from '@/lib/types';

const W: World = {
  name: 'test',
  width: 31,
  height: 31,
  block: 10,
  walls: [[3, 0]],
  start: { cell: [0, 0], facing: 'E' },
};

const dirs = (...instructions: Directions['instructions']): Directions => ({ instructions });

describe('executor', () => {
  it('moves straight along a road', () => {
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs({ op: 'MOVE', n: 2 }, { op: 'ARRIVE' }));
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual([2, 0]);
  });

  it('turns left and right correctly', () => {
    expect(execute(W, { cell: [0, 0], facing: 'N' }, dirs({ op: 'TURN', dir: 'LEFT' })).final.facing).toBe('W');
    expect(execute(W, { cell: [0, 0], facing: 'N' }, dirs({ op: 'TURN', dir: 'RIGHT' })).final.facing).toBe('E');
  });

  it('crashes into construction and stops at the last good cell', () => {
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs({ op: 'MOVE', n: 5 }, { op: 'ARRIVE' }));
    expect(r.outcome).toBe('crashed');
    expect(r.final.cell).toEqual([2, 0]);
    expect(r.final.reason).toMatch(/construction/);
  });

  it('crashes off the grid edge', () => {
    const r = execute(W, { cell: [0, 0], facing: 'S' }, dirs({ op: 'MOVE', n: 1 }));
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/edge/);
  });

  it('crashes when leaving a road into a building', () => {
    const r = execute(W, { cell: [1, 0], facing: 'N' }, dirs({ op: 'MOVE', n: 1 }));
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/building/);
  });

  it('expands REPEAT', () => {
    const r = execute(
      W,
      { cell: [0, 0], facing: 'E' },
      dirs({ op: 'REPEAT', count: 2, body: [{ op: 'MOVE', n: 1 }] }, { op: 'ARRIVE' }),
    );
    expect(r.final.cell).toEqual([2, 0]);
  });

  it('emits one frame per traversed cell', () => {
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs({ op: 'MOVE', n: 2 }, { op: 'ARRIVE' }));
    expect(r.frames.map((f) => f.status)).toEqual(['start', 'moved', 'moved', 'arrived']);
  });

  it('treats MOVE with non-positive n as a no-op', () => {
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs({ op: 'MOVE', n: 0 }, { op: 'ARRIVE' }));
    expect(r.final.cell).toEqual([0, 0]);
    expect(r.outcome).toBe('arrived');
  });

  it('guards against an over-large REPEAT expansion', () => {
    const r = execute(
      W,
      { cell: [0, 0], facing: 'E' },
      dirs({ op: 'REPEAT', count: 1e9, body: [{ op: 'MOVE', n: 1 }] }),
    );
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/too large/);
  });
});
