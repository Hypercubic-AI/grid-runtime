import { describe, it, expect } from 'vitest';
import { sx, sy, CELL, nearestEquivalentAngle } from '@/lib/render';
import { groupRuns } from '@/lib/render';
import { barrierRects, oneWayChevrons, PULL_IN, ROAD_W } from '@/lib/render';
import type { World } from '@/lib/types';

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

const W: World = {
  name: 't', width: 61, height: 41, block: 10,
  walls: [[35, 20], [36, 20], [37, 20]],
  oneways: [
    { cell: [50, 30], allow: 'N' }, { cell: [50, 31], allow: 'N' }, { cell: [50, 32], allow: 'N' },
    { cell: [50, 33], allow: 'N' }, { cell: [50, 34], allow: 'N' }, { cell: [50, 35], allow: 'N' },
    { cell: [50, 36], allow: 'N' }, { cell: [50, 37], allow: 'N' }, { cell: [50, 38], allow: 'N' },
    { cell: [50, 39], allow: 'N' }, { cell: [50, 40], allow: 'N' },
  ],
  start: { cell: [10, 30], facing: 'E' },
};

describe('barrierRects', () => {
  it('downtown construction: no intersection-abutting end, so no PULL_IN inset', () => {
    const [r] = barrierRects(W);
    // horizontal run xmin=35..xmax=37, neither at a multiple of block(10)
    expect(r.width).toBeCloseTo((37 - 35) * CELL + CELL); // full span, no inset
    expect(r.height).toBe(ROAD_W);
  });
  it('insets an end that abuts an intersection node', () => {
    const synth: World = { ...W, walls: [[40, 20], [41, 20]] }; // x=40 is a node
    const [r] = barrierRects(synth);
    expect(r.width).toBeCloseTo((41 - 40) * CELL + CELL - PULL_IN); // left end pulled in
  });
});

describe('oneWayChevrons', () => {
  it('orients chevrons by allow (N -> angle 0) and skips the outer-edge cell', () => {
    const cs = oneWayChevrons(W);
    expect(cs.length).toBeGreaterThanOrEqual(3);
    expect(cs.every((c) => c.angle === 0)).toBe(true);
    // none sits on the northern edge cell y=40 (screen y === 0)
    expect(cs.every((c) => c.y !== 0)).toBe(true);
  });
});

import { placeRect, maxBuildingHeight, clampSilhouette, houseBlocks, buildingsZSorted, cellHash } from '@/lib/render';
import type { Footprint } from '@/lib/types';

const CITY: World = {
  name: 'd', width: 101, height: 61, block: 10,
  walls: [[34, 30], [35, 30], [36, 30]],
  oneways: [{ cell: [50, 30], allow: 'N' }],
  start: { cell: [10, 30], facing: 'E' },
  places: [
    { type: 'park', cell: [45, 30], footprint: [41, 31, 9, 9] },
    { type: 'library', cell: [15, 50], footprint: [11, 51, 9, 9] },
  ],
};

describe('placeRect (Y-flip inversion)', () => {
  it('pins the central park rect: top comes from the NORTH row fy+fh-1', () => {
    const r = placeRect(CITY, [41, 31, 9, 9] as Footprint);
    expect(r.y).toBe(sy(61, 39) - CELL / 2);   // north row 39, NOT 31
    expect(r.y).not.toBe(sy(61, 31) - CELL / 2);
    expect(r).toEqual({ x: 567, y: 287, width: 126, height: 126 });
  });
});

describe('maxBuildingHeight', () => {
  it('is (block - 2) * CELL', () => {
    expect(maxBuildingHeight(CITY)).toBe((10 - 2) * CELL); // 112
  });
});

describe('clampSilhouette', () => {
  it('keeps body + roof within maxBuildingHeight for any block size', () => {
    const small: World = { ...CITY, block: 4 }; // cap = (4-2)*CELL = 28
    const cap = maxBuildingHeight(small);
    const house = clampSilhouette(small, CELL * 1.5, CELL * 0.55);
    expect(house.body + house.roof).toBeLessThanOrEqual(cap);
    const civic = clampSilhouette(small, CELL * 6, CELL * 1.1);
    expect(civic.body + civic.roof).toBeLessThanOrEqual(cap);
    // a normal house on the default world is unchanged
    expect(clampSilhouette(CITY, CELL * 1.5, CELL * 0.55).body).toBe(CELL * 1.5);
  });
});

describe('houseBlocks', () => {
  it('excludes blocks whose interior intersects any footprint', () => {
    const blocks = houseBlocks(CITY);
    // The central park footprint [41,31,9,9] lies in the block with SW corner (40,30).
    expect(blocks.some((b) => b.x0 === 40 && b.y0 === 30)).toBe(false);
    // The NW library footprint [11,51,9,9] lies in block (10,50).
    expect(blocks.some((b) => b.x0 === 10 && b.y0 === 50)).toBe(false);
    // A plain block, e.g. (0,0), is a house block.
    expect(blocks.some((b) => b.x0 === 0 && b.y0 === 0)).toBe(true);
    // 10x6 = 60 blocks total, minus the 2 occupied by these two places = 58.
    expect(blocks.length).toBe(60 - 2);
  });
  it('excludes a block even when the footprint is a sub-block rectangle', () => {
    const w: World = { ...CITY, places: [{ type: 'civic', cell: [5, 0], footprint: [2, 1, 3, 3] }] };
    // footprint sits inside block (0,0); that block must be excluded though it only covers 3x3 of the interior.
    expect(houseBlocks(w).some((b) => b.x0 === 0 && b.y0 === 0)).toBe(false);
  });
});

describe('buildingsZSorted', () => {
  it('orders north-to-south by base ascending (south paints last / on top)', () => {
    const ds = buildingsZSorted(CITY);
    for (let i = 1; i < ds.length; i++) expect(ds[i].base).toBeGreaterThanOrEqual(ds[i - 1].base);
    // every place is present
    expect(ds.filter((d) => d.kind === 'park').length).toBe(1);
    expect(ds.filter((d) => d.kind === 'library').length).toBe(1);
  });
  it('breaks ties deterministically by (base, cell-y, cell-x, kind)', () => {
    // two places with the SAME footprint south row -> same base; tie-break must order them.
    const w: World = {
      ...CITY,
      places: [
        { type: 'park', cell: [45, 30], footprint: [41, 31, 9, 9] },   // base from y=31, fx=41
        { type: 'civic', cell: [25, 30], footprint: [21, 31, 9, 9] },  // same base (y=31), fx=21
      ],
    };
    const ds = buildingsZSorted(w).filter((d) => d.kind === 'park' || d.kind === 'civic');
    // same base => tie-break on cell-x (21 < 41) => civic before park
    expect(ds[0].kind).toBe('civic');
    expect(ds[1].kind).toBe('park');
    expect(ds[0].base).toBe(ds[1].base);
  });
});

describe('cellHash', () => {
  it('is deterministic and in [0,1)', () => {
    expect(cellHash(3, 7)).toBe(cellHash(3, 7));
    expect(cellHash(3, 7)).not.toBe(cellHash(7, 3));
    const v = cellHash(123, 456);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
