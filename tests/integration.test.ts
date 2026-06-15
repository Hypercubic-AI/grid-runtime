import { describe, it, expect } from 'vitest';
import { execute } from '@/lib/executor';
import { judge } from '@/lib/verdict';
import type { World, Directions, Scenario } from '@/lib/types';
import world from '@/data/worlds/downtown.json';
import loop from '@/data/samples/loop.json';
import toThirtieth from '@/data/samples/to-30th.json';

const W = world as World;

describe('integration: sample on default world', () => {
  it('the loop sample returns the robot to its start, arrived', () => {
    const r = execute(W, W.start, loop as Directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual(W.start.cell);
    expect(r.final.facing).toBe(W.start.facing);
  });

  it('the to-30th scenario sample arrives at its declared expected target (PASS)', () => {
    const s = toThirtieth as unknown as { directions: Directions; scenario: Scenario };
    const r = execute(W, s.scenario.start, s.directions);
    const v = judge(r, s.scenario.expected);
    expect(v?.pass).toBe(true);
  });

  it('a crash takes precedence over a matching final cell in the verdict', () => {
    // Drive straight off the east edge; the final cell equals the last good cell,
    // but the verdict must report the crash, not a pass.
    const r = execute(W, W.start, { instructions: [{ op: 'MOVE', n: 100 }, { op: 'ARRIVE' }] });
    expect(r.outcome).toBe('crashed');
    const v = judge(r, { cell: r.final.cell, facing: r.final.facing });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/edge/);
  });
});
