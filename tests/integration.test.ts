import { describe, it, expect } from 'vitest';
import { execute } from '@/lib/executor';
import type { World, Directions } from '@/lib/types';
import world from '@/data/worlds/downtown.json';
import loop from '@/data/samples/loop.json';

describe('integration: sample on default world', () => {
  it('the loop sample returns the robot to its start, arrived', () => {
    const w = world as World;
    const r = execute(w, w.start, loop as Directions);
    expect(r.outcome).toBe('arrived');
    expect(r.final.cell).toEqual(w.start.cell);
    expect(r.final.facing).toBe(w.start.facing);
  });
});
