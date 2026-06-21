import type { World, Place } from '@/lib/types';
import { CELL, sx, sy, placeRect, maxBuildingHeight, clampSilhouette, buildingsZSorted, cellHash } from '@/lib/render';

// Layer 2: flat ground fills (park lawn tint + plot tint), drawn on the ground plane.
export function FootprintFills({ world }: { world: World }) {
  return (
    <g className="footprints">
      {(world.places ?? []).map((p, i) => {
        const r = placeRect(world, p.footprint);
        const cls = p.type === 'park' ? 'plot lawn' : 'plot';
        return <rect key={`fp${i}`} className={cls} x={r.x} y={r.y} width={r.width} height={r.height} rx={3} />;
      })}
    </g>
  );
}

// A single oblique-extruded house at lot cell (cx, cy), rising NORTH (up-screen).
function HouseLot({ cx, cy, world }: { cx: number; cy: number; world: World }) {
  const w = CELL * 0.74;             // footprint width on screen
  const baseX = sx(cx);
  const baseY = sy(world.height, cy); // south front sits on the south interior row
  const { body: h, roof: roofH } = clampSilhouette(world, CELL * 1.5, CELL * 0.55); // wall + roof <= cap (any block size)
  const depth = CELL * 0.42;          // oblique side depth
  const left = baseX - w / 2;
  const right = baseX + w / 2;
  const top = baseY - h;              // wall top (smaller screen-y = North)
  const roofPeak = top - roofH;
  const v = cellHash(cx, cy);         // deterministic variation
  const roofClass = v < 0.34 ? 'roof-a' : v < 0.67 ? 'roof-b' : 'roof-c';
  return (
    <g className="house">
      {/* soft ground shadow */}
      <ellipse className="bshadow" cx={baseX + depth * 0.5} cy={baseY + 2} rx={w * 0.7} ry={CELL * 0.16} />
      {/* oblique right side */}
      <polygon className="wall-side" points={`${right},${baseY} ${right + depth},${baseY - depth} ${right + depth},${top - depth} ${right},${top}`} />
      {/* front wall */}
      <rect className="wall-front" x={left} y={top} width={w} height={h} />
      {/* two windows + door */}
      <rect className="win" x={left + w * 0.16} y={top + h * 0.2} width={w * 0.22} height={h * 0.26} />
      <rect className="win" x={left + w * 0.62} y={top + h * 0.2} width={w * 0.22} height={h * 0.26} />
      <rect className="door" x={left + w * 0.4} y={baseY - h * 0.42} width={w * 0.2} height={h * 0.42} />
      {/* gable roof: lit front slope + shaded back, peak to the north */}
      <polygon className={`roof ${roofClass}`} points={`${left},${top} ${right},${top} ${baseX},${roofPeak}`} />
      <polygon className="roof-side" points={`${right},${top} ${right + depth},${top - depth} ${baseX + depth},${roofPeak - depth} ${baseX},${roofPeak}`} />
    </g>
  );
}

// Houses line the SOUTH interior edge of a block (single-sided; design §5.3 simplification).
function HouseRow({ block, world }: { block: { x0: number; y0: number }; world: World }) {
  const y = block.y0 + 1; // south interior row
  const xs: number[] = [];
  for (let x = block.x0 + 1; x < block.x0 + world.block; x += 2) xs.push(x); // every other interior column
  return (
    <g>
      {xs.map((x) => <HouseLot key={`h${x}-${y}`} cx={x} cy={y} world={world} />)}
    </g>
  );
}

// Layered tree canopies + trunk + shadow on the park footprint (deterministic placement).
function ParkTrees({ place, world }: { place: Place; world: World }) {
  const [fx, fy, fw, fh] = place.footprint;
  const trees: { x: number; y: number }[] = [];
  for (let yy = fy + 1; yy < fy + fh - 1; yy += 3) {
    for (let xx = fx + 1; xx < fx + fw - 1; xx += 3) {
      if (cellHash(xx, yy) > 0.45) trees.push({ x: xx, y: yy });
    }
  }
  const cap = maxBuildingHeight(world);
  return (
    <g className="park">
      {trees.map((t, i) => {
        const px = sx(t.x);
        const py = sy(world.height, t.y);
        const rMax = CELL * (0.5 + cellHash(t.x, t.y) * 0.3);
        const full = CELL * 0.9 + rMax * 1.05;        // trunk + canopy extent at full size
        const scale = full > cap ? cap / full : 1;    // shrink to fit a small-block cap
        const trunkH = CELL * 0.9 * scale;
        const r = rMax * scale;
        return (
          <g key={`t${i}`}>
            <ellipse className="bshadow" cx={px + 2} cy={py + 2} rx={r * 0.9} ry={CELL * 0.18} />
            <rect className="trunk" x={px - CELL * 0.07} y={py - trunkH} width={CELL * 0.14} height={trunkH} />
            <circle className="canopy-dark" cx={px} cy={py - trunkH} r={r} />
            <circle className="canopy" cx={px - r * 0.2} cy={py - trunkH - r * 0.25} r={r * 0.8} />
          </g>
        );
      })}
    </g>
  );
}

// One grander massing centred on the footprint: stepped base, columns, body, roof.
function Massing({ place, world }: { place: Place; world: World }) {
  const r = placeRect(world, place.footprint);
  const cx = r.x + r.width / 2;
  const bodyW = r.width * 0.74;
  const grand = place.type === 'civic';
  const { body: bodyH, roof: roofExtra } = clampSilhouette(world, CELL * (grand ? 6 : 5), grand ? CELL * 1.1 : CELL * 0.5);
  const baseY = r.y + r.height;            // south edge of the plot (front)
  const left = cx - bodyW / 2;
  const top = baseY - bodyH;
  const stepH = CELL * 0.5;
  const cols = grand ? 5 : 4;
  return (
    <g className={`massing ${place.type}`}>
      <ellipse className="bshadow" cx={cx + 4} cy={baseY + 2} rx={bodyW * 0.7} ry={CELL * 0.2} />
      {/* stepped base */}
      <rect className="stone-step" x={left - CELL * 0.4} y={baseY - stepH} width={bodyW + CELL * 0.8} height={stepH} />
      {/* body */}
      <rect className="stone-body" x={left} y={top} width={bodyW} height={bodyH - stepH} />
      {/* columns */}
      {Array.from({ length: cols }).map((_, i) => {
        const colW = bodyW / (cols * 2);
        const gap = bodyW / cols;
        const x = left + gap * i + colW / 2;
        return <rect key={`c${i}`} className="column" x={x} y={top + CELL * 0.4} width={colW} height={bodyH - stepH - CELL * 0.6} />;
      })}
      {/* roof: flat for civic (pedimented), simple cap for library */}
      {grand
        ? <polygon className="roof-civic" points={`${left - CELL * 0.5},${top} ${left + bodyW + CELL * 0.5},${top} ${cx},${top - roofExtra}`} />
        : <rect className="roof-lib" x={left - CELL * 0.3} y={top - roofExtra} width={bodyW + CELL * 0.6} height={roofExtra} />}
    </g>
  );
}

// Layer 4: every tall object, z-sorted (north→south) so fronts paint on top.
export function Buildings({ world }: { world: World }) {
  const drawables = buildingsZSorted(world);
  return (
    <g className="buildings">
      {drawables.map((d, i) => {
        if (d.kind === 'house' && d.block) return <HouseRow key={`b${i}`} block={d.block} world={world} />;
        if (d.kind === 'park' && d.place) return <ParkTrees key={`b${i}`} place={d.place} world={world} />;
        if ((d.kind === 'library' || d.kind === 'civic') && d.place) return <Massing key={`b${i}`} place={d.place} world={world} />;
        return null;
      })}
    </g>
  );
}
