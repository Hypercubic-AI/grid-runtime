import type { World } from './types';

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
