import type { World, Dir } from './types';

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
