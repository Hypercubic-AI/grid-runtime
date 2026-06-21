import { describe, it, expect } from 'vitest';
import { validateTerrain } from '@/lib/terrain';
import projection from '@/data/worlds/downtown.terrain.json';

const base = (): Record<string, unknown> => ({
  name: 'd', width: 101, height: 61, block: 10,
  start: { cell: [10, 30], facing: 'E' },
  walls: [[34, 30], [35, 30], [36, 30]],
  oneways: [{ cell: [50, 30], allow: 'N' }],
  places: [
    { type: 'park', cell: [45, 30], footprint: [41, 31, 9, 9] },
    { type: 'library', cell: [15, 50], footprint: [11, 51, 9, 9] },
  ],
});

describe('validateTerrain (projection rules)', () => {
  it('accepts the shipped downtown projection', () => {
    const r = validateTerrain(projection);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.world.places?.length).toBe(5);
  });

  it('accepts a minimal valid world', () => {
    const r = validateTerrain(base());
    expect(r.ok).toBe(true);
  });

  it('ignores extra semantic keys from a full file', () => {
    const full: Record<string, unknown> = { ...base(), streets: [{ name: 'Oak', row: 3 }], avenues: { count: 11 }, houseScheme: { unitsPerBlock: 100, oddSide: 'S', evenSide: 'N' } };
    full.places = [{ type: 'park', name: 'Park', cell: [45, 30], footprint: [41, 31, 9, 9] }] as never;
    expect(validateTerrain(full).ok).toBe(true);
  });

  it('rejects width/height/block < 2 or non-integer', () => {
    expect(validateTerrain({ ...base(), width: 1 }).ok).toBe(false);
    expect(validateTerrain({ ...base(), block: 1 }).ok).toBe(false);
    expect(validateTerrain({ ...base(), height: 60.5 }).ok).toBe(false);
  });

  it('rejects an off-road start, an out-of-bounds start, a start on a wall, and a bad facing', () => {
    expect(validateTerrain({ ...base(), start: { cell: [3, 3], facing: 'E' } }).ok).toBe(false); // interior
    expect(validateTerrain({ ...base(), start: { cell: [200, 30], facing: 'E' } }).ok).toBe(false);
    expect(validateTerrain({ ...base(), start: { cell: [35, 30], facing: 'E' } }).ok).toBe(false); // on a wall
    expect(validateTerrain({ ...base(), start: { cell: [10, 30], facing: 'X' } }).ok).toBe(false);
  });

  it('rejects an off-road wall and an out-of-bounds wall', () => {
    expect(validateTerrain({ ...base(), walls: [[33, 33]] }).ok).toBe(false); // interior cell
    expect(validateTerrain({ ...base(), walls: [[34, 300]] }).ok).toBe(false);
  });

  it('rejects an off-road one-way and a bad allow', () => {
    expect(validateTerrain({ ...base(), oneways: [{ cell: [33, 33], allow: 'N' }] }).ok).toBe(false);
    expect(validateTerrain({ ...base(), oneways: [{ cell: [50, 30], allow: 'UP' }] }).ok).toBe(false);
  });

  it('rejects a footprint touching a road', () => {
    // [40,31,...] includes x=40, an avenue column -> on a road
    const r = validateTerrain({ ...base(), places: [{ type: 'park', cell: [45, 30], footprint: [40, 31, 9, 9] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/road/i);
  });

  it('rejects an out-of-bounds footprint and zero w/h', () => {
    expect(validateTerrain({ ...base(), places: [{ type: 'park', cell: [45, 30], footprint: [41, 31, 9, 99] }] }).ok).toBe(false);
    expect(validateTerrain({ ...base(), places: [{ type: 'park', cell: [45, 30], footprint: [41, 31, 0, 9] }] }).ok).toBe(false);
  });

  it('rejects overlapping footprints', () => {
    const r = validateTerrain({ ...base(), places: [
      { type: 'park', cell: [45, 30], footprint: [41, 31, 9, 9] },
      { type: 'library', cell: [45, 40], footprint: [41, 35, 5, 5] }, // overlaps the park
    ] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/overlap/i);
  });

  it('rejects a bad place type', () => {
    expect(validateTerrain({ ...base(), places: [{ type: 'school', cell: [45, 30], footprint: [41, 31, 9, 9] }] }).ok).toBe(false);
  });

  it('rejects an intersection entrance (no interior 4-neighbour)', () => {
    // (40,30) is x%10==0 && y%10==0 -> an intersection; cannot be edge-adjacent to interior
    const r = validateTerrain({ ...base(), places: [{ type: 'park', cell: [40, 30], footprint: [41, 31, 9, 9] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/adjacent|interior|intersection/i);
  });

  it('rejects an entrance not edge-adjacent to its footprint', () => {
    const r = validateTerrain({ ...base(), places: [{ type: 'park', cell: [15, 30], footprint: [41, 31, 9, 9] }] });
    expect(r.ok).toBe(false);
  });

  it('rejects an entrance on a wall', () => {
    // footprint [37,31,3,9] sits east of the wall; entrance (35,30) is a wall cell adjacent to nothing interior here
    const r = validateTerrain({ ...base(), places: [{ type: 'park', cell: [35, 30], footprint: [31, 31, 3, 9] }] });
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate entrances across places', () => {
    const r = validateTerrain({ ...base(), places: [
      { type: 'park', cell: [45, 30], footprint: [41, 31, 9, 9] },
      { type: 'civic', cell: [45, 30], footprint: [41, 21, 9, 9] }, // same entrance
    ] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/entrance|distinct|shared/i);
  });
});
