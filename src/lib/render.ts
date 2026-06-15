export const CELL = 14; // pixels per cell
export const ROAD_W = CELL * 0.62; // road stroke width
export const ROBOT_R = CELL * 0.42;

export const sx = (x: number): number => x * CELL;
// Grid y increases North (up); SVG y increases down, so flip.
export const sy = (worldHeight: number, y: number): number => (worldHeight - 1 - y) * CELL;

export function multiples(limit: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v < limit; v += step) out.push(v);
  return out;
}
