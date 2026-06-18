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

  it('guards against an over-large REPEAT with a non-empty body', () => {
    const r = execute(
      W,
      { cell: [0, 0], facing: 'E' },
      dirs({ op: 'REPEAT', count: 1e9, body: [{ op: 'MOVE', n: 1 }] }),
    );
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/too large/);
  });

  it('guards against a huge REPEAT with an EMPTY body without hanging', () => {
    // Regression: an empty body never grows the output list, so a guard that only
    // checks emitted-instruction count would spin forever. This must return fast.
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs({ op: 'REPEAT', count: 1e9, body: [] }));
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/too large/);
  });

  it('guards against deeply-nested REPEAT without overflowing the stack', () => {
    let nested: Directions['instructions'] = [{ op: 'MOVE', n: 1 }];
    for (let i = 0; i < 5000; i++) nested = [{ op: 'REPEAT', count: 1, body: nested }];
    const r = execute(W, { cell: [0, 0], facing: 'E' }, dirs(...nested));
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/nested too deeply/);
  });

  it('fails loudly on an unknown opcode instead of silently skipping it', () => {
    const r = execute(W, { cell: [0, 0], facing: 'E' }, {
      instructions: [{ op: 'TELEPORT' } as unknown as Directions['instructions'][number]],
    });
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/unknown instruction/);
  });

  it('crashes when driving the wrong way down a one-way road', () => {
    const ow: World = { ...W, oneways: [{ cell: [0, 1], allow: 'N' }] };
    const r = execute(ow, { cell: [0, 2], facing: 'S' }, dirs({ op: 'MOVE', n: 1 }));
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/one-way/);
    expect(r.final.cell).toEqual([0, 2]); // stopped before entering the one-way cell
  });

  it('allows driving the correct way down a one-way road', () => {
    const ow: World = { ...W, oneways: [{ cell: [0, 1], allow: 'N' }] };
    const r = execute(ow, { cell: [0, 0], facing: 'N' }, dirs({ op: 'MOVE', n: 1 }, { op: 'ARRIVE' }));
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual([0, 1]);
  });
});

describe('executor — source line attribution', () => {
  it('copies each instruction line onto the frames it emits (start frame has none)', () => {
    const r = execute(
      W,
      { cell: [0, 0], facing: 'E' },
      { instructions: [
        { op: 'MOVE', n: 2, line: 1 },
        { op: 'TURN', dir: 'LEFT', line: 2 },
        { op: 'ARRIVE', line: 3 },
      ] },
    );
    expect(r.frames.map((f) => [f.status, f.line])).toEqual([
      ['start', undefined],
      ['moved', 1],
      ['moved', 1],
      ['turned', 2],
      ['arrived', 3],
    ]);
  });

  it('re-uses a REPEAT body line on every iteration', () => {
    const r = execute(
      W,
      { cell: [0, 0], facing: 'E' },
      { instructions: [{ op: 'REPEAT', count: 2, body: [{ op: 'MOVE', n: 1, line: 5 }], line: 4 }] },
    );
    expect(r.frames.filter((f) => f.status === 'moved').map((f) => f.line)).toEqual([5, 5]);
  });
});
