import { describe, it, expect } from 'vitest';
import { scenarioForWorld } from '@/app/RuntimeView';
import type { World, Scenario } from '@/lib/types';

const small: World = { name: 's', width: 21, height: 21, block: 10, walls: [], start: { cell: [0, 0], facing: 'E' } };

describe('scenarioForWorld (stale-scenario safety on swap)', () => {
  it('keeps a scenario whose cells are all in bounds', () => {
    const sc: Scenario = { world: 'x', start: { cell: [0, 0], facing: 'E' }, expected: { cell: [10, 10], facing: 'E' } };
    expect(scenarioForWorld(small, sc)).toEqual(sc);
  });
  it('drops a scenario whose expected cell is out of bounds in the new world', () => {
    const sc: Scenario = { world: 'x', start: { cell: [0, 0], facing: 'E' }, expected: { cell: [100, 0], facing: 'E' } };
    expect(scenarioForWorld(small, sc)).toBeNull();
  });
  it('drops a scenario whose any expected_legs cell is out of bounds', () => {
    const sc: Scenario = { world: 'x', start: { cell: [0, 0], facing: 'E' }, expected_legs: [{ cell: [10, 0] }, { cell: [0, 99] }] };
    expect(scenarioForWorld(small, sc)).toBeNull();
  });
  it('passes through null', () => {
    expect(scenarioForWorld(small, null)).toBeNull();
  });
});
