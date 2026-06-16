import type { ReactNode } from 'react';
import type { World, Dir } from '@/lib/types';
import { CELL, ROAD_W, NODE_R, sx, sy, multiples } from '@/lib/render';

const ARROW_ANGLE: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

export function CityGrid({ world, children }: { world: World; children?: ReactNode }) {
  const w = world.width * CELL;
  const h = world.height * CELL;
  const avenues = multiples(world.width, world.block);
  const streets = multiples(world.height, world.block);

  return (
    <svg className="city" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* city blocks (filled, so the canvas reads as buildings separated by roads) */}
      {streets.slice(0, -1).map((y0) =>
        avenues.slice(0, -1).map((x0) => (
          <rect
            key={`b${x0}-${y0}`}
            className="block"
            x={sx(x0) + ROAD_W / 2}
            y={sy(world.height, y0 + world.block) + ROAD_W / 2}
            width={world.block * CELL - ROAD_W}
            height={world.block * CELL - ROAD_W}
            rx={3}
          />
        )),
      )}
      {/* roads */}
      {avenues.map((x) => (
        <line key={`a${x}`} className="road" x1={sx(x)} y1={0} x2={sx(x)} y2={h} strokeWidth={ROAD_W} />
      ))}
      {streets.map((y) => (
        <line
          key={`s${y}`}
          className="road"
          x1={0}
          y1={sy(world.height, y)}
          x2={w}
          y2={sy(world.height, y)}
          strokeWidth={ROAD_W}
        />
      ))}
      {/* intersection nodes */}
      {avenues.map((x) =>
        streets.map((y) => (
          <circle key={`i${x}-${y}`} className="node" cx={sx(x)} cy={sy(world.height, y)} r={NODE_R} />
        )),
      )}
      {/* one-way markers: a small chevron on each one-way cell pointing the allowed way */}
      {(world.oneways ?? []).map((o, i) => {
        const cx = sx(o.cell[0]);
        const cy = sy(world.height, o.cell[1]);
        const s = CELL * 0.3;
        return (
          <polygon
            key={`o${i}`}
            className="oneway"
            points={`${cx},${cy - s} ${cx + s * 0.66},${cy + s * 0.5} ${cx - s * 0.66},${cy + s * 0.5}`}
            transform={`rotate(${ARROW_ANGLE[o.allow]} ${cx} ${cy})`}
          />
        );
      })}
      {/* construction (inset slightly so each cell reads as a discrete obstacle) */}
      {world.walls.map(([x, y], i) => (
        <rect
          key={`w${i}`}
          className="wall"
          x={sx(x) - CELL / 2 + 1}
          y={sy(world.height, y) - CELL / 2 + 1}
          width={CELL - 2}
          height={CELL - 2}
          rx={2}
        />
      ))}
      {children}
    </svg>
  );
}
