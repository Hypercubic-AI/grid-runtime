import type { Frame } from '@/lib/types';
import { sx, sy } from '@/lib/render';

// Draw the traveled path as a single polyline (reads as a path, not dust).
export function Trail({
  frames,
  index,
  worldHeight,
}: {
  frames: Frame[];
  index: number;
  worldHeight: number;
}) {
  const points = frames
    .slice(0, index + 1)
    .map((f) => `${sx(f.cell[0])},${sy(worldHeight, f.cell[1])}`)
    .join(' ');
  if (!points) return null;
  return (
    <g>
      <polyline className="trail-glow" points={points} />
      <polyline className="trail" points={points} />
    </g>
  );
}
