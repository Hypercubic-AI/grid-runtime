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
