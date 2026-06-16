import type { World, Dir } from './types';

export function inBounds(w: World, x: number, y: number): boolean {
  return x >= 0 && x < w.width && y >= 0 && y < w.height;
}

export function isRoad(w: World, x: number, y: number): boolean {
  return x % w.block === 0 || y % w.block === 0;
}

export function isBlocked(w: World, x: number, y: number): boolean {
  return w.walls.some(([wx, wy]) => wx === x && wy === y);
}

export function isTraversable(w: World, x: number, y: number): boolean {
  return inBounds(w, x, y) && isRoad(w, x, y) && !isBlocked(w, x, y);
}

const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

// True if entering (x,y) while travelling `facing` goes against a one-way road
// there. Travel in the allowed direction — or perpendicular to it (turning onto
// the road) — is fine; only travel in the opposite direction is blocked.
export function oneWayBlocks(w: World, x: number, y: number, facing: Dir): boolean {
  const ow = w.oneways?.find((o) => o.cell[0] === x && o.cell[1] === y);
  return ow ? facing === OPPOSITE[ow.allow] : false;
}
