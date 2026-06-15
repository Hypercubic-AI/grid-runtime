import type { Frame } from '@/lib/types';
import { sx, sy } from '@/lib/render';

export function Trail({
  frames,
  index,
  worldHeight,
}: {
  frames: Frame[];
  index: number;
  worldHeight: number;
}) {
  return (
    <>
      {frames.slice(0, index + 1).map((f, i) => (
        <circle key={i} className="trail" cx={sx(f.cell[0])} cy={sy(worldHeight, f.cell[1])} r={2.5} />
      ))}
    </>
  );
}
