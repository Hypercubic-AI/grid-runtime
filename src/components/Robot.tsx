import type { Dir, FrameStatus } from '@/lib/types';
import { sx, sy, ROBOT_R } from '@/lib/render';

const ANGLE: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

export function Robot({
  cell,
  facing,
  worldHeight,
  status,
}: {
  cell: [number, number];
  facing: Dir;
  worldHeight: number;
  status: FrameStatus;
}) {
  const cls = `robot${status === 'arrived' ? ' arrived' : status === 'crashed' ? ' crashed' : ''}`;
  return (
    <g
      className={cls}
      style={{
        transform: `translate(${sx(cell[0])}px, ${sy(worldHeight, cell[1])}px) rotate(${ANGLE[facing]}deg)`,
        transformBox: 'fill-box',
        transformOrigin: 'center',
      }}
    >
      <circle className="robot-body" r={ROBOT_R} />
      <polygon
        className="robot-notch"
        points={`0,${-ROBOT_R} ${ROBOT_R * 0.55},${ROBOT_R * 0.25} ${-ROBOT_R * 0.55},${ROBOT_R * 0.25}`}
      />
    </g>
  );
}
