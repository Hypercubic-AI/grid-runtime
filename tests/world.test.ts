import { describe, it, expect } from 'vitest';
import { inBounds, isRoad, isBlocked, isTraversable, oneWayBlocks } from '@/lib/world';
import type { World } from '@/lib/types';

const W: World = {
  name: 'test',
  width: 21,
  height: 21,
  block: 10,
  walls: [[5, 10]],
  start: { cell: [0, 0], facing: 'N' },
};

describe('world', () => {
  it('inBounds respects edges', () => {
    expect(inBounds(W, 0, 0)).toBe(true);
    expect(inBounds(W, 20, 20)).toBe(true);
    expect(inBounds(W, -1, 0)).toBe(false);
    expect(inBounds(W, 21, 0)).toBe(false);
  });

  it('isRoad is true on avenue columns and street rows, false inside blocks', () => {
    expect(isRoad(W, 10, 3)).toBe(true);
    expect(isRoad(W, 3, 10)).toBe(true);
    expect(isRoad(W, 0, 0)).toBe(true);
    expect(isRoad(W, 3, 3)).toBe(false);
  });

  it('isBlocked finds walls', () => {
    expect(isBlocked(W, 5, 10)).toBe(true);
    expect(isBlocked(W, 6, 10)).toBe(false);
  });

  it('isTraversable requires in-bounds road that is not blocked', () => {
    expect(isTraversable(W, 3, 10)).toBe(true);
    expect(isTraversable(W, 5, 10)).toBe(false);
    expect(isTraversable(W, 3, 3)).toBe(false);
    expect(isTraversable(W, 30, 10)).toBe(false);
  });
});

describe('oneWayBlocks', () => {
  const OW: World = { ...W, oneways: [{ cell: [10, 10], allow: 'N' }] };

  it('blocks only the direction opposite to the allowed one', () => {
    expect(oneWayBlocks(OW, 10, 10, 'S')).toBe(true); // opposite of N
    expect(oneWayBlocks(OW, 10, 10, 'N')).toBe(false); // the allowed direction
    expect(oneWayBlocks(OW, 10, 10, 'E')).toBe(false); // perpendicular (turning onto it)
    expect(oneWayBlocks(OW, 10, 10, 'W')).toBe(false); // perpendicular
  });

  it('does not constrain ordinary cells', () => {
    expect(oneWayBlocks(OW, 0, 0, 'S')).toBe(false);
    expect(oneWayBlocks(W, 10, 10, 'S')).toBe(false); // world with no one-ways
  });
});

import type { Place, Footprint, World as W2 } from '@/lib/types';
describe('Place/World.places typing', () => {
  it('accepts a world with places of each type', () => {
    const fp: Footprint = [41, 31, 9, 9];
    const places: Place[] = [
      { type: 'park', cell: [45, 30], footprint: fp },
      { type: 'library', cell: [15, 50], footprint: [11, 51, 9, 9] },
      { type: 'civic', cell: [45, 20], footprint: [41, 21, 9, 9] },
    ];
    const w: W2 = { name: 'x', width: 101, height: 61, block: 10, walls: [], start: { cell: [10, 30], facing: 'E' }, places };
    expect(w.places?.length).toBe(3);
    expect(w.places?.[0].footprint).toEqual(fp);
  });
});
