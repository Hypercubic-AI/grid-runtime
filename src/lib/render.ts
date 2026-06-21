import type { World, Dir, Place, Footprint } from './types';

export const CELL = 14; // pixels per cell
export const ROAD_W = CELL * 0.62; // road stroke width
export const ROBOT_R = CELL * 0.42;
export const NODE_R = CELL * 0.22; // intersection node radius

export const sx = (x: number): number => x * CELL;
// Grid y increases North (up); SVG y increases down, so flip.
export const sy = (worldHeight: number, y: number): number => (worldHeight - 1 - y) * CELL;

export function multiples(limit: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v < limit; v += step) out.push(v);
  return out;
}

// Given the previously-rendered (cumulative) angle and a new absolute target in
// [0,360), return the co-terminal target nearest to `prev` so a rotation always
// takes the short way and never spins 270° across the 0/360 wrap.
export function nearestEquivalentAngle(prev: number, target: number): number {
  let delta = (target - prev) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return prev + delta;
}

export interface CellRun {
  cells: [number, number][]; // ordered ascending along the run axis
  orient: 'h' | 'v' | 'point';
}

export const PULL_IN = NODE_R; // inset at any run end abutting an intersection node

const CHEVRON_ANGLE: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Chevron {
  x: number;
  y: number;
  angle: number;
}

// Group cells into maximal contiguous collinear runs. Inputs (walls / one-way lanes)
// are collinear by construction; an L-bend would split at the corner.
export function groupRuns(cells: [number, number][]): CellRun[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const set = new Set(cells.map(([x, y]) => key(x, y)));
  const visited = new Set<string>();
  const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const runs: CellRun[] = [];
  for (const [x, y] of sorted) {
    if (visited.has(key(x, y))) continue;
    const hasLeft = set.has(key(x - 1, y));
    const hasRight = set.has(key(x + 1, y));
    const hasDown = set.has(key(x, y - 1));
    const hasUp = set.has(key(x, y + 1));
    let runCells: [number, number][] = [[x, y]];
    let orient: CellRun['orient'] = 'point';
    if (!hasLeft && hasRight) {
      orient = 'h';
      runCells = [];
      let cx = x;
      while (set.has(key(cx, y))) runCells.push([cx++, y]);
    } else if (!hasDown && hasUp) {
      orient = 'v';
      runCells = [];
      let cy = y;
      while (set.has(key(x, cy))) runCells.push([x, cy++]);
    }
    for (const [px, py] of runCells) visited.add(key(px, py));
    runs.push({ cells: runCells, orient });
  }
  return runs;
}

// One inset hazard rect per wall run, in screen space.
export function barrierRects(world: World): Rect[] {
  const atNode = (v: number) => v % world.block === 0;
  return groupRuns(world.walls).map((run) => {
    const xs = run.cells.map((c) => c[0]);
    const ys = run.cells.map((c) => c[1]);
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);
    const ymin = Math.min(...ys);
    const ymax = Math.max(...ys);
    if (run.orient === 'v') {
      const x = sx(xmin) - ROAD_W / 2;
      let top = sy(world.height, ymax) - CELL / 2; // north end → smaller screen y
      let bot = sy(world.height, ymin) + CELL / 2;
      if (atNode(ymax)) top += PULL_IN;
      if (atNode(ymin)) bot -= PULL_IN;
      return { x, y: top, width: ROAD_W, height: bot - top };
    }
    let left = sx(xmin) - CELL / 2;
    let right = sx(xmax) + CELL / 2;
    if (atNode(xmin)) left += PULL_IN;
    if (atNode(xmax)) right -= PULL_IN;
    return { x: left, y: sy(world.height, ymin) - ROAD_W / 2, width: right - left, height: ROAD_W };
  });
}

// Chevrons every `every` cells along each one-way run, from an interior offset, skipping
// outer-edge cells; angle derived from the run's `allow` direction.
export function oneWayChevrons(world: World, every = 2): Chevron[] {
  const ows = world.oneways ?? [];
  if (!ows.length) return [];
  const allowOf = new Map(ows.map((o) => [`${o.cell[0]},${o.cell[1]}`, o.allow] as const));
  const onEdge = (x: number, y: number) => x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1;
  const out: Chevron[] = [];
  for (const run of groupRuns(ows.map((o) => o.cell))) {
    const allow = allowOf.get(`${run.cells[0][0]},${run.cells[0][1]}`) as Dir;
    const angle = CHEVRON_ANGLE[allow];
    for (let i = 1; i < run.cells.length; i += every) {
      const [cx, cy] = run.cells[i];
      if (onEdge(cx, cy)) continue;
      out.push({ x: sx(cx), y: sy(world.height, cy), angle });
    }
  }
  return out;
}

// --- Living-city geometry (design §5.3) -------------------------------------

// A footprint rect in screen space. The TOP comes from the NORTHERN row
// (fy + fh - 1), mirroring the .blk north-edge math (y increases North).
export function placeRect(w: World, [fx, fy, fw, fh]: Footprint): Rect {
  return {
    x: sx(fx) - CELL / 2,
    y: sy(w.height, fy + fh - 1) - CELL / 2,
    width: fw * CELL,
    height: fh * CELL,
  };
}

// Every building (house, tree, library, civic) is capped here so its roof never
// reaches the road to the north of its block.
export function maxBuildingHeight(w: World): number {
  return (w.block - 2) * CELL;
}

// Clamp a building's body + roof so the TOTAL silhouette never exceeds
// maxBuildingHeight (roofs never cross the north road) — for ANY block size,
// including small-block uploaded maps. The roof is capped first so it can't dominate.
export function clampSilhouette(w: World, body: number, roof: number): { body: number; roof: number } {
  const cap = maxBuildingHeight(w);
  const r = Math.max(0, Math.min(roof, cap * 0.4));
  return { body: Math.max(0, Math.min(body, cap - r)), roof: r };
}

export interface BlockId {
  x0: number; // SW-corner avenue (multiple of block, < width-1)
  y0: number; // SW-corner street (multiple of block, < height-1)
}

// Cell-set of all footprint interior cells across every place.
function footprintCells(w: World): Set<string> {
  const set = new Set<string>();
  for (const p of w.places ?? []) {
    const [fx, fy, fw, fh] = p.footprint;
    for (let yy = fy; yy < fy + fh; yy++) for (let xx = fx; xx < fx + fw; xx++) set.add(`${xx},${yy}`);
  }
  return set;
}

// True if block (x0,y0)'s strict interior intersects any footprint cell.
function blockHasPlace(x0: number, y0: number, block: number, foot: Set<string>): boolean {
  for (let yy = y0 + 1; yy < y0 + block; yy++) {
    for (let xx = x0 + 1; xx < x0 + block; xx++) {
      if (foot.has(`${xx},${yy}`)) return true;
    }
  }
  return false;
}

// Blocks (SW corners) whose interior cell-set is disjoint from every footprint.
export function houseBlocks(w: World): BlockId[] {
  const foot = footprintCells(w);
  const avenues = multiples(w.width, w.block).slice(0, -1);
  const streets = multiples(w.height, w.block).slice(0, -1);
  const out: BlockId[] = [];
  for (const y0 of streets) {
    for (const x0 of avenues) {
      if (!blockHasPlace(x0, y0, w.block, foot)) out.push({ x0, y0 });
    }
  }
  return out;
}

export type DrawableKind = 'house' | 'park' | 'library' | 'civic';
export interface Drawable {
  kind: DrawableKind;
  cell: [number, number]; // representative front cell for z ordering & tie-break
  base: number;           // screen-y of the visual front = sy(height, southmostCellY)
  place?: Place;
  block?: BlockId;
}

// All tall objects, ordered so southern (front) objects paint LAST (on top).
// `base` is the screen-y of the southmost cell; ascending base == north→south.
export function buildingsZSorted(w: World): Drawable[] {
  const out: Drawable[] = [];
  for (const b of houseBlocks(w)) {
    const southRow = b.y0 + 1; // south interior row
    out.push({ kind: 'house', block: b, cell: [b.x0 + 1, southRow], base: sy(w.height, southRow) });
  }
  for (const p of w.places ?? []) {
    const [fx, fy] = p.footprint;
    out.push({ kind: p.type, place: p, cell: [fx, fy], base: sy(w.height, fy) });
  }
  out.sort((a, b) =>
    a.base - b.base ||
    a.cell[1] - b.cell[1] ||
    a.cell[0] - b.cell[0] ||
    a.kind.localeCompare(b.kind),
  );
  return out;
}

// Deterministic per-cell hash in [0,1) (no Math.random — stable for screenshots).
export function cellHash(x: number, y: number): number {
  const h = ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0);
  return h / 4294967296;
}
