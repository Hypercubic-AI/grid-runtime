import { describe, it, expect } from 'vitest';
import { execute } from '@/lib/executor';
import { judge } from '@/lib/verdict';
import { validateTerrain } from '@/lib/terrain';
import { isRoad } from '@/lib/world';
import type { World, Directions, Scenario } from '@/lib/types';
import world from '@/data/worlds/downtown.terrain.json';
import loop from '@/data/samples/loop.json';
import sweep from '@/data/samples/sweep.json';
import detour from '@/data/samples/detour.json';

const W = world as World;
type Bundle = { directions: Directions; scenario: Scenario };
const passes = (b: Bundle) => judge(execute(W, b.scenario.start, b.directions), b.scenario.expected)?.pass === true;
const cells = (b: Bundle) => {
  const out: string[] = [];
  for (const f of execute(W, b.scenario.start, b.directions).frames) {
    const k = `${f.cell[0]},${f.cell[1]}`;
    if (out[out.length - 1] !== k) out.push(k);
  }
  return out;
};

describe('integration: living-city samples on the loaded world', () => {
  it('the shipped downtown projection validates', () => {
    expect(validateTerrain(world).ok).toBe(true);
  });

  it('no footprint cell sits on a road', () => {
    for (const p of W.places ?? []) {
      const [fx, fy, fw, fh] = p.footprint;
      for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) expect(isRoad(W, x, y)).toBe(false);
    }
  });

  it('loop returns the robot to its start, arrived', () => {
    const r = execute(W, W.start, loop as Directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual(W.start.cell); // [10,30]
    expect(r.final.facing).toBe(W.start.facing); // E
  });

  it('sweep PASSes and visibly tours the central park + a library', () => {
    const b = sweep as unknown as Bundle;
    expect(passes(b)).toBe(true);
    const r = execute(W, b.scenario.start, b.directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual([75, 10]);
    expect(r.final.facing).toBe('W');
    const path = cells(b);
    expect(path).toContain('45,30');                       // central park entrance
    expect(path).toContain('75,10');                       // SE library entrance
    expect(path.some((c) => /^50,(3[1-9]|40)$/.test(c))).toBe(true); // up the one-way
  });

  it('detour hits the Oak St closure region and routes around it, PASS', () => {
    const b = detour as unknown as Bundle;
    expect(passes(b)).toBe(true);
    const r = execute(W, b.scenario.start, b.directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual([60, 30]);
    expect(r.final.facing).toBe('E');
  });

  it('the detour is necessary: a straight run east from its start crashes into the closure', () => {
    const r = execute(W, { cell: [20, 30], facing: 'E' }, { instructions: [{ op: 'MOVE', n: 30 }, { op: 'ARRIVE' }] });
    expect(r.outcome).toBe('crashed');
    expect(r.final.cell).toEqual([33, 30]);
    expect(r.final.reason).toMatch(/construction/);
  });

  it('a crash takes precedence over a matching final cell in the verdict', () => {
    const r = execute(W, W.start, { instructions: [{ op: 'MOVE', n: 100 }, { op: 'ARRIVE' }] });
    expect(r.outcome).toBe('crashed');
    const v = judge(r, { cell: r.final.cell, facing: r.final.facing });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/construction|edge|one-way/);
  });
});
