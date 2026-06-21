import type { ReactNode } from 'react';
import type { World } from '@/lib/types';
import { CELL, ROAD_W, NODE_R, sx, sy, multiples, barrierRects, oneWayChevrons, cityViewBox } from '@/lib/render';
import { FootprintFills, Buildings } from './buildings';

const ordinal = (n: number) => {
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH';
  return `${n}${suf}`;
};

export function CityGrid({
  world,
  start,
  goal,
  waypoints = [],
  children,
}: {
  world: World;
  start?: [number, number];
  goal?: [number, number] | null;
  waypoints?: [number, number][];
  children?: ReactNode;
}) {
  // The START marker must mark where the robot actually begins — the scenario's
  // start when one overrides it, else the world default.
  const startCell = start ?? world.start.cell;
  const netW = (world.width - 1) * CELL; // road network spans avenue 0 .. last avenue
  const netH = (world.height - 1) * CELL; // .. and street 0 .. last street
  const PAD = CELL; // margin so border roads sit inside the rounded card, never clipped
  const SIGN_L = 70; // street-name blades sit in the left margin (wide enough for the longest name); mirrored on the right to center the grid
  const SIGN_B = 26; // avenue-number blades sit in the bottom margin; mirrored on top to center the grid
  const avenues = multiples(world.width, world.block);
  const streets = multiples(world.height, world.block);
  const barriers = barrierRects(world);
  const chevrons = oneWayChevrons(world);
  const chev = CELL * 0.34;
  const goalXY = goal ? ([sx(goal[0]), sy(world.height, goal[1])] as const) : null;

  // Tint block grounds green under park footprints (their SW-corner block keys).
  const parkBlocks = new Set<string>();
  for (const p of world.places ?? []) {
    if (p.type !== 'park') continue;
    const [fx, fy] = p.footprint;
    const bx = Math.floor(fx / world.block) * world.block;
    const by = Math.floor(fy / world.block) * world.block;
    parkBlocks.add(`${bx},${by}`);
  }

  return (
    <svg className="city" viewBox={cityViewBox(world, PAD, { left: SIGN_L, right: SIGN_L, top: SIGN_B, bottom: SIGN_B })} preserveAspectRatio="xMidYMid meet" role="img" aria-label="City street map">
      <defs>
        <pattern id="hazard" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="22" height="22" fill="#1f1812" />
          <rect width="11" height="22" fill="#f8a23a" />
        </pattern>
        <radialGradient id="robotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="rgba(245,179,1,.5)" />
          <stop offset="1" stopColor="rgba(245,179,1,0)" />
        </radialGradient>
        <radialGradient id="goalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="rgba(245,179,1,.3)" />
          <stop offset="1" stopColor="rgba(245,179,1,0)" />
        </radialGradient>
      </defs>

      {/* block grounds (tinted green under park footprints) */}
      {streets.slice(0, -1).map((y0) =>
        avenues.slice(0, -1).map((x0) => (
          <rect
            key={`b${x0}-${y0}`}
            className={parkBlocks.has(`${x0},${y0}`) ? 'blk lawn-tint' : 'blk'}
            x={sx(x0) + ROAD_W / 2}
            y={sy(world.height, y0 + world.block) + ROAD_W / 2}
            width={world.block * CELL - ROAD_W}
            height={world.block * CELL - ROAD_W}
            rx={3}
          />
        )),
      )}

      {/* layer 2: flat place ground fills (park lawn / building plot) */}
      <FootprintFills world={world} />

      {/* roads */}
      {avenues.map((x) => (
        <line key={`a${x}`} className="road" x1={sx(x)} y1={0} x2={sx(x)} y2={netH} strokeWidth={ROAD_W} />
      ))}
      {streets.map((y) => (
        <line key={`s${y}`} className="road" x1={0} y1={sy(world.height, y)} x2={netW} y2={sy(world.height, y)} strokeWidth={ROAD_W} />
      ))}

      {/* dashed lane centerlines */}
      {avenues.map((x) => (
        <line key={`la${x}`} className="lane" x1={sx(x)} y1={0} x2={sx(x)} y2={netH} />
      ))}
      {streets.map((y) => (
        <line key={`ls${y}`} className="lane" x1={0} y1={sy(world.height, y)} x2={netW} y2={sy(world.height, y)} />
      ))}

      {/* intersection nodes */}
      {avenues.map((x) =>
        streets.map((y) => <circle key={`i${x}-${y}`} className="node" cx={sx(x)} cy={sy(world.height, y)} r={NODE_R} />),
      )}

      {/* one-way chevrons (data-derived placement + orientation) */}
      {chevrons.map((c, i) => (
        <polygon
          key={`o${i}`}
          className="chevron"
          points={`${c.x},${c.y - chev} ${c.x + chev * 0.66},${c.y + chev * 0.5} ${c.x - chev * 0.66},${c.y + chev * 0.5}`}
          transform={`rotate(${c.angle} ${c.x} ${c.y})`}
        />
      ))}

      {/* layer 4: z-sorted vector buildings (houses, parks, library/civic massings) */}
      <Buildings world={world} />

      {/* construction barriers across the road */}
      {barriers.map((b, i) => (
        <g key={`w${i}`}>
          <rect className="barrier" x={b.x} y={b.y} width={b.width} height={b.height} rx={4} />
          <rect className="barrier-edge" x={b.x} y={b.y} width={b.width} height={b.height} rx={4} />
          <text className="barrier-label" x={b.x + b.width / 2} y={b.y - 6}>ROAD CLOSED</text>
        </g>
      ))}

      {/* start marker — the robot's actual start (scenario start, else world default) */}
      <g>
        <circle className="start-ring" cx={sx(startCell[0])} cy={sy(world.height, startCell[1])} r={CELL * 0.42} />
        <text className="marker-label" x={sx(startCell[0])} y={sy(world.height, startCell[1]) + CELL * 1.15}>
          START
        </text>
      </g>

      {/* intermediate leg waypoints (subdued) */}
      {waypoints.map((p, i) => (
        <circle key={`wp${i}`} className="start-ring" cx={sx(p[0])} cy={sy(world.height, p[1])} r={CELL * 0.3} />
      ))}

      {/* goal marker (only when a scenario is active) */}
      {goalXY && (
        <g>
          <circle cx={goalXY[0]} cy={goalXY[1]} r={CELL * 1.1} fill="url(#goalGlow)" />
          <circle className="goal-ring" cx={goalXY[0]} cy={goalXY[1]} r={CELL * 0.5} />
          <circle className="goal-ring" cx={goalXY[0]} cy={goalXY[1]} r={CELL * 0.22} />
          <text className="marker-label" x={goalXY[0]} y={goalXY[1] - CELL * 0.85}>GOAL</text>
        </g>
      )}

      {/* street & avenue blade signs (in the margins) */}
      <g className="signs">
        {(world.streets ?? []).map((s) => {
          const cy = sy(world.height, s.row * world.block);
          const label = s.name.toUpperCase();
          const w = label.length * 6.6 + 13;
          const x = -10 - w;
          return (
            <g key={`st${s.row}`}>
              <rect className="blade-bg" x={x} y={cy - 8.5} width={w} height={17} rx={2.5} />
              <text className="blade-text" x={x + w / 2} y={cy + 3.6}>{label}</text>
            </g>
          );
        })}
        {Array.from({ length: Math.max(0, (world.avenues?.count ?? 0) - 1) }, (_, i) => i + 1).map((a) => {
          const cx = sx(a * world.block);
          const label = ordinal(a);
          const w = label.length * 5.6 + 9;
          const y = netH + 9;
          return (
            <g key={`av${a}`}>
              <rect className="blade-bg" x={cx - w / 2} y={y} width={w} height={15} rx={2.5} />
              <text className="blade-text sm" x={cx} y={y + 10.6}>{label}</text>
            </g>
          );
        })}
      </g>

      {/* trail + robot on top */}
      {children}
    </svg>
  );
}
