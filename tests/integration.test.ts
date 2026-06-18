import { describe, it, expect } from 'vitest';
import { execute } from '@/lib/executor';
import { judge } from '@/lib/verdict';
import type { World, Directions, Scenario } from '@/lib/types';
import world from '@/data/worlds/downtown.json';
import loop from '@/data/samples/loop.json';
import straightEast from '@/data/samples/straight-east.json';
import spiral from '@/data/samples/spiral.json';
import detour from '@/data/samples/detour.json';

const W = world as World;
type Bundle = { directions: Directions; scenario: Scenario };
const passes = (b: Bundle) => {
  const r = execute(W, b.scenario.start, b.directions);
  return judge(r, b.scenario.expected)?.pass === true;
};

describe('integration: samples on the default world', () => {
  it('loop returns the robot to its start, arrived', () => {
    const r = execute(W, W.start, loop as Directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual(W.start.cell);
    expect(r.final.facing).toBe(W.start.facing);
  });

  it('straight-east bundle PASSes', () => {
    expect(passes(straightEast as unknown as Bundle)).toBe(true);
  });

  it('spiral bundle PASSes (hero demo)', () => {
    expect(passes(spiral as unknown as Bundle)).toBe(true);
  });

  it('detour bundle PASSes and routes around the construction', () => {
    const b = detour as unknown as Bundle;
    expect(passes(b)).toBe(true);
    const r = execute(W, b.scenario.start, b.directions);
    expect(r.outcome).toBe('arrived'); // never crashes into the y=20 closure
  });

  it('the detour is necessary: a straight run east from its start crashes into the closure', () => {
    const r = execute(W, { cell: [20, 20], facing: 'E' }, { instructions: [{ op: 'MOVE', n: 20 }, { op: 'ARRIVE' }] });
    expect(r.outcome).toBe('crashed');
    expect(r.final.reason).toMatch(/construction/);
  });

  it('a crash takes precedence over a matching final cell in the verdict', () => {
    const r = execute(W, W.start, { instructions: [{ op: 'MOVE', n: 100 }, { op: 'ARRIVE' }] });
    expect(r.outcome).toBe('crashed');
    const v = judge(r, { cell: r.final.cell, facing: r.final.facing });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/edge/);
  });
});
