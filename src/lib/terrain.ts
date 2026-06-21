import type { World, Place, Footprint, Dir } from './types';
import { inBounds, isRoad } from './world';

export type TerrainResult = { ok: true; world: World } | { ok: false; error: string };

const DIRS = new Set<Dir>(['N', 'E', 'S', 'W']);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isCell = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && isInt(v[0]) && isInt(v[1]);
const fail = (error: string): TerrainResult => ({ ok: false, error });

export function validateTerrain(data: unknown): TerrainResult {
  if (!data || typeof data !== 'object') return fail('Map must be a JSON object.');
  const d = data as Record<string, unknown>;

  // Rule 1: dimensions
  const { width, height, block } = d as { width?: unknown; height?: unknown; block?: unknown };
  if (!isInt(width) || width < 2) return fail('Map "width" must be an integer ≥ 2.');
  if (!isInt(height) || height < 2) return fail('Map "height" must be an integer ≥ 2.');
  if (!isInt(block) || block < 2) return fail('Map "block" must be an integer ≥ 2.');

  // A minimal World shell to feed isRoad/inBounds (they only read width/height/block/walls).
  const walls = (d.walls ?? []) as unknown;
  if (!Array.isArray(walls)) return fail('Map "walls" must be an array.');
  for (const w of walls) {
    if (!isCell(w)) return fail('Each wall must be a [x,y] cell of integers.');
  }
  const w: World = { name: String(d.name ?? ''), width, height, block, walls: walls as [number, number][], start: { cell: [0, 0], facing: 'N' } };
  const onRoad = (x: number, y: number) => isRoad(w, x, y);
  const inB = (x: number, y: number) => inBounds(w, x, y);
  const isWall = (x: number, y: number) => w.walls.some(([wx, wy]) => wx === x && wy === y);

  // Rule 2: start
  const start = d.start as { cell?: unknown; facing?: unknown } | undefined;
  if (!start || !isCell(start.cell)) return fail('Map "start.cell" must be a [x,y] cell.');
  if (typeof start.facing !== 'string' || !DIRS.has(start.facing as Dir)) return fail('Map "start.facing" must be one of N, E, S, W.');
  {
    const [sxc, syc] = start.cell;
    if (!inB(sxc, syc)) return fail(`Start (${sxc},${syc}) is outside the map.`);
    if (!onRoad(sxc, syc)) return fail(`Start (${sxc},${syc}) is not on a road.`);
    if (isWall(sxc, syc)) return fail(`Start (${sxc},${syc}) sits on a closed (wall) cell.`);
  }

  // Rule 4: walls on roads + in bounds
  for (const [wx, wy] of w.walls) {
    if (!inB(wx, wy)) return fail(`Wall (${wx},${wy}) is outside the map.`);
    if (!onRoad(wx, wy)) return fail(`Wall (${wx},${wy}) is not on a road (walls close roads, not blocks).`);
  }

  // Rule 5: one-ways on roads + valid allow
  const oneways = (d.oneways ?? []) as unknown;
  if (!Array.isArray(oneways)) return fail('Map "oneways" must be an array.');
  for (const o of oneways) {
    const ow = o as { cell?: unknown; allow?: unknown };
    if (!isCell(ow.cell)) return fail('Each one-way must have a [x,y] cell.');
    const [ox, oy] = ow.cell;
    if (!inB(ox, oy)) return fail(`One-way (${ox},${oy}) is outside the map.`);
    if (!onRoad(ox, oy)) return fail(`One-way (${ox},${oy}) is not on a road.`);
    if (typeof ow.allow !== 'string' || !DIRS.has(ow.allow as Dir)) return fail(`One-way (${ox},${oy}) "allow" must be one of N, E, S, W.`);
  }

  // Rule 6: places
  const places = (d.places ?? []) as unknown;
  if (!Array.isArray(places)) return fail('Map "places" must be an array.');
  const footCells: Array<Set<string>> = [];
  const entrances = new Set<string>();
  for (const p of places) {
    const pl = p as { type?: unknown; cell?: unknown; footprint?: unknown };
    if (pl.type !== 'park' && pl.type !== 'library' && pl.type !== 'civic') {
      return fail(`Place "type" must be park, library, or civic (got ${JSON.stringify(pl.type)}).`);
    }
    const fp = pl.footprint;
    if (!Array.isArray(fp) || fp.length !== 4 || !fp.every(isInt)) return fail('Each place "footprint" must be [x,y,w,h] integers.');
    const [fx, fy, fw, fh] = fp as Footprint;
    if (fw < 1 || fh < 1) return fail(`Footprint at (${fx},${fy}) must have width and height ≥ 1.`);
    const cells = new Set<string>();
    for (let yy = fy; yy < fy + fh; yy++) {
      for (let xx = fx; xx < fx + fw; xx++) {
        if (!inB(xx, yy)) return fail(`Footprint cell (${xx},${yy}) is outside the map.`);
        if (onRoad(xx, yy)) return fail(`Footprint cell (${xx},${yy}) is on a road; footprints must be block interior.`);
        cells.add(`${xx},${yy}`);
      }
    }
    // pairwise non-overlap
    for (const prev of footCells) {
      for (const c of cells) if (prev.has(c)) return fail(`Footprints overlap at cell ${c}.`);
    }
    footCells.push(cells);

    // entrance
    if (!isCell(pl.cell)) return fail('Each place "cell" (entrance) must be a [x,y] cell.');
    const [cx, cy] = pl.cell;
    if (!inB(cx, cy)) return fail(`Entrance (${cx},${cy}) is outside the map.`);
    if (!onRoad(cx, cy)) return fail(`Entrance (${cx},${cy}) is not on a road.`);
    if (isWall(cx, cy)) return fail(`Entrance (${cx},${cy}) sits on a closed (wall) cell.`);
    const adj = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    const touches = adj.some(([ax, ay]) => cells.has(`${ax},${ay}`));
    if (!touches) {
      return fail(`Entrance (${cx},${cy}) is not edge-adjacent to its footprint (intersections and map-boundary cells have no interior neighbour).`);
    }
    const key = `${cx},${cy}`;
    if (entrances.has(key)) return fail(`Two places share the entrance (${cx},${cy}); entrances must be distinct.`);
    entrances.add(key);
  }

  return { ok: true, world: data as World };
}
