'use client';
import { useRef } from 'react';
import type { Dir, FrameStatus } from '@/lib/types';
import { sx, sy, ROBOT_R, nearestEquivalentAngle } from '@/lib/render';

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
  // Carry a cumulative heading so a turn always rotates the short way (never spins
  // 270° across the 0/360 wrap).
  const angleRef = useRef(ANGLE[facing]);
  const angle = nearestEquivalentAngle(angleRef.current, ANGLE[facing]);
  angleRef.current = angle;

  const cls = `robot${status === 'arrived' ? ' arrived' : status === 'crashed' ? ' crashed' : ''}`;
  return (
    <g
      className={cls}
      style={{
        transform: `translate(${sx(cell[0])}px, ${sy(worldHeight, cell[1])}px) rotate(${angle}deg)`,
        transformBox: 'fill-box',
        transformOrigin: 'center',
      }}
    >
      <circle className="robot-body" r={ROBOT_R} />
      <polygon
        className="robot-notch"
        points={`0,${-ROBOT_R * 0.95} ${ROBOT_R * 0.62},${ROBOT_R * 0.3} ${-ROBOT_R * 0.62},${ROBOT_R * 0.3}`}
      />
    </g>
  );
}
