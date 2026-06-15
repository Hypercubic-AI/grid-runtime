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
