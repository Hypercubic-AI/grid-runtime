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

// A layered 2.5D tree: trunk + three canopy layers (dark base, mid, lit highlight) + soft shadow.
// Positioned by absolute screen coords so callers can jitter placement off the cell grid.
function Tree({ px, py, r, world }: { px: number; py: number; r: number; world: World }) {
  const cap = maxBuildingHeight(world);
  const full = CELL * 0.55 + r * 1.15;
  const s = full > cap ? cap / full : 1; // shrink to fit a small-block cap
  const trunkH = CELL * 0.55 * s;
  const cr = r * s;
  const ty = py - trunkH;
  return (
    <g>
      <ellipse className="bshadow" cx={px + cr * 0.3} cy={py + 1.5} rx={cr * 0.95} ry={CELL * 0.15} />
      <rect className="trunk" x={px - CELL * 0.055} y={py - trunkH} width={CELL * 0.11} height={trunkH} />
      <circle className="canopy-dark" cx={px} cy={ty} r={cr} />
      <circle className="canopy" cx={px - cr * 0.22} cy={ty - cr * 0.22} r={cr * 0.74} />
      <circle className="canopy-lite" cx={px - cr * 0.42} cy={ty - cr * 0.42} r={cr * 0.34} />
    </g>
  );
}

// A single oblique-extruded house at lot cell (cx, cy), rising NORTH (up-screen).
function HouseLot({ cx, cy, world }: { cx: number; cy: number; world: World }) {
  const w = CELL * 1.3;
  const baseX = sx(cx);
  const baseY = sy(world.height, cy); // south front sits on the south interior row
  const { body: h, roof: roofH } = clampSilhouette(world, CELL * 2.0, CELL * 0.85); // wall + roof <= cap
  const depth = CELL * 0.52;          // oblique side depth
  const left = baseX - w / 2;
  const right = baseX + w / 2;
  const top = baseY - h;
  const roofPeak = top - roofH;
  const v = cellHash(cx, cy);
  const roofClass = v < 0.4 ? 'roof-a' : v < 0.72 ? 'roof-b' : 'roof-c';
  return (
    <g className="house">
      <ellipse className="bshadow" cx={baseX + depth * 0.5} cy={baseY + 2} rx={w * 0.66} ry={CELL * 0.15} />
      {/* oblique right side */}
      <polygon className="wall-side" points={`${right},${baseY} ${right + depth},${baseY - depth} ${right + depth},${top - depth} ${right},${top}`} />
      {/* front wall + windows + door */}
      <rect className="wall-front" x={left} y={top} width={w} height={h} />
      <rect className="win" x={left + w * 0.17} y={top + h * 0.2} width={w * 0.26} height={h * 0.3} rx={1} />
      <rect className="win" x={left + w * 0.57} y={top + h * 0.2} width={w * 0.26} height={h * 0.3} rx={1} />
      <rect className="door" x={left + w * 0.41} y={baseY - h * 0.4} width={w * 0.18} height={h * 0.4} rx={1} />
      {/* gable roof: shaded back slope, then lit front face on top */}
      <polygon className="roof-side" points={`${right},${top} ${right + depth},${top - depth} ${baseX + depth},${roofPeak - depth} ${baseX},${roofPeak}`} />
      <polygon className={`roof ${roofClass}`} points={`${left - 1},${top} ${right + 1},${top} ${baseX},${roofPeak}`} />
    </g>
  );
}

// A city block: varied development (some empty, some with one or two houses, some a fuller row)
// plus a few trees scattered + jittered in the BACK of the block, set off from the house fronts,
// so the city reads as lived-in rather than a uniform wall of houses.
function BlockScape({ block, world }: { block: { x0: number; y0: number }; world: World }) {
  const { x0, y0 } = block;
  const y = y0 + 1; // south interior row (house fronts)
  const bh = cellHash(x0 * 2 + 7, y0 * 3 + 5); // per-block development seed
  const empty = bh < 0.17;
  const density = empty ? 0 : bh < 0.45 ? 0.42 : bh < 0.74 ? 0.7 : 1;
  const slots = [x0 + 2, x0 + 4, x0 + 6, x0 + 8].filter((hx) => hx < x0 + world.block);
  const houses = empty ? [] : slots.filter((hx) => cellHash(hx, y) <= density);

  // Trees: sparse and intentional — only some blocks have any, and a treed block gets just a few,
  // set back from the house fronts. Empty blocks occasionally become small green lots (groves).
  const treeSeed = cellHash(x0 * 7 + 3, y0 * 5 + 9);
  const wantsTrees = empty ? treeSeed > 0.4 : treeSeed > 0.55;
  const maxTrees = empty ? 4 : 2;
  const trees: { px: number; py: number; r: number }[] = [];
  if (wantsTrees) {
    const back = empty ? y0 + 2 : y0 + 5; // developed blocks keep trees to the back
    const cands: { tx: number; ty: number; h: number }[] = [];
    for (let ty = back; ty < y0 + world.block - 1; ty++)
      for (let tx = x0 + 2; tx < x0 + world.block - 1; tx++)
        cands.push({ tx, ty, h: cellHash(tx * 13 + 1, ty * 17 + 5) });
    cands.sort((a, b) => b.h - a.h);
    for (const c of cands.slice(0, maxTrees)) {
      const jx = (cellHash(c.tx, c.ty) - 0.5) * 1.0;
      const jy = (cellHash(c.ty, c.tx) - 0.5) * 1.0;
      const r = CELL * (0.6 + cellHash(c.tx + 3, c.ty + 7) * 0.38);
      trees.push({ px: sx(c.tx + jx), py: sy(world.height, c.ty + jy), r });
    }
  }
  trees.sort((a, b) => a.py - b.py); // back (north) first; houses paint last (front)
  return (
    <g>
      {trees.map((t, i) => <Tree key={`t${i}`} px={t.px} py={t.py} r={t.r} world={world} />)}
      {houses.map((hx) => <HouseLot key={`h${hx}`} cx={hx} cy={y} world={world} />)}
    </g>
  );
}

// Park: a natural cluster of layered trees scattered across the lawn footprint.
function ParkTrees({ place, world }: { place: Place; world: World }) {
  const [fx, fy, fw, fh] = place.footprint;
  const trees: { px: number; py: number; r: number }[] = [];
  for (let yy = fy + 1; yy < fy + fh - 1; yy += 2) {
    for (let xx = fx + 1; xx < fx + fw - 1; xx += 2) {
      if (cellHash(xx * 3 + 2, yy * 3 + 1) > 0.32) {
        const jx = (cellHash(xx, yy) - 0.5) * 0.8;
        const jy = (cellHash(yy, xx) - 0.5) * 0.8;
        const r = CELL * (0.5 + cellHash(xx + 5, yy + 5) * 0.32);
        trees.push({ px: sx(xx + jx), py: sy(world.height, yy + jy), r });
      }
    }
  }
  trees.sort((a, b) => a.py - b.py);
  return <g className="park">{trees.map((t, i) => <Tree key={`t${i}`} px={t.px} py={t.py} r={t.r} world={world} />)}</g>;
}

// One grand classical building (library / civic): stepped stylobate, a fluted colonnade standing
// out against a recessed dark cella, an entablature, and a pediment with a recessed tympanum.
// Civic is taller and gets a roof finial. Heights are capped so the roof never crosses the road.
function Massing({ place, world }: { place: Place; world: World }) {
  const r = placeRect(world, place.footprint);
  const grand = place.type === 'civic';
  const cx = r.x + r.width / 2;
  const baseY = r.y + r.height; // front (south) edge of the plot
  const T = Math.min(CELL * (grand ? 8 : 6.8), maxBuildingHeight(world)); // capped total height
  const stylo = T * 0.16, colsH = T * 0.52, entH = T * 0.09, pedH = T * 0.23;
  const colBot = baseY - stylo;
  const colTop = colBot - colsH;
  const entTop = colTop - entH;
  const pedPeak = entTop - pedH;
  const colW = r.width * (grand ? 0.64 : 0.58);
  const left = cx - colW / 2, right = cx + colW / 2;
  const depth = CELL * 0.5;
  const n = grand ? 6 : 5;
  const gap = colW / n;
  const shaftW = gap * 0.5;
  const capH = colsH * 0.13;
  return (
    <g className={`massing ${place.type}`}>
      <ellipse className="bshadow" cx={cx + depth * 0.7} cy={baseY + 2} rx={r.width * 0.5} ry={CELL * 0.22} />
      {/* stepped stylobate, widest at the bottom */}
      {[0, 1, 2].map((i) => {
        const inset = i * CELL * 0.34;
        const sh = stylo / 3;
        return <rect key={`s${i}`} className="stone-step" x={left - CELL * 0.9 + inset} y={baseY - sh * (i + 1)} width={colW + CELL * 1.8 - inset * 2} height={sh + 0.6} />;
      })}
      {/* dark recessed cella so the columns read as columns */}
      <rect className="cella" x={left} y={colTop} width={colW} height={colsH} />
      {/* fluted colonnade: base + lit shaft + capital */}
      {Array.from({ length: n }).map((_, i) => {
        const x = left + gap * (i + 0.5) - shaftW / 2;
        return (
          <g key={`c${i}`}>
            <rect className="column" x={x - shaftW * 0.24} y={colBot - capH} width={shaftW * 1.48} height={capH} />
            <rect className="column" x={x} y={colTop + capH} width={shaftW} height={colsH - capH * 2} />
            <rect className="column-lite" x={x} y={colTop + capH} width={shaftW * 0.36} height={colsH - capH * 2} />
            <rect className="column" x={x - shaftW * 0.24} y={colTop} width={shaftW * 1.48} height={capH} />
          </g>
        );
      })}
      {/* entablature */}
      <rect className="stone-body" x={left - CELL * 0.5} y={entTop} width={colW + CELL} height={entH} />
      {/* pediment + recessed tympanum */}
      <polygon className="stone-body" points={`${left - CELL * 0.6},${entTop} ${right + CELL * 0.6},${entTop} ${cx},${pedPeak}`} />
      <polygon className="cella" points={`${left + CELL * 0.4},${entTop - 0.5} ${right - CELL * 0.4},${entTop - 0.5} ${cx},${pedPeak + pedH * 0.45}`} />
      {grand && <rect className="stone-step" x={cx - CELL * 0.16} y={pedPeak - CELL * 0.55} width={CELL * 0.32} height={CELL * 0.6} />}
    </g>
  );
}

// A pointed (lancet) Gothic window.
function lancet(x: number, w: number, bottom: number, h: number, key: string) {
  const archH = w * 0.6;
  const shaftH = Math.max(0, h - archH);
  const topY = bottom - shaftH;
  return (
    <g key={key}>
      <rect className="glass" x={x} y={topY} width={w} height={shaftH} />
      <polygon className="glass" points={`${x},${topY} ${x + w},${topY} ${x + w / 2},${topY - archH}`} />
    </g>
  );
}

// A crenellated (battlement) parapet along [x, x+wd]: merlons of height h sitting on edge y.
function battlements(x: number, wd: number, y: number, h: number, key: string) {
  const n = Math.max(2, Math.round(wd / (CELL * 0.55)));
  const mw = wd / (n * 2 - 1);
  return (
    <g key={key}>
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} className="sand" x={x + i * 2 * mw} y={y - h} width={mw} height={h} />
      ))}
    </g>
  );
}

// The library: an Oxford Bodleian-style building — honey sandstone, a central tower with stacked
// tiers (echoing the Tower of the Five Orders), Gothic lancet windows, and a battlemented roofline.
function Library({ place, world }: { place: Place; world: World }) {
  const r = placeRect(world, place.footprint);
  const cx = r.x + r.width / 2;
  const baseY = r.y + r.height; // front (south) edge
  const T = Math.min(CELL * 7.2, maxBuildingHeight(world)); // total height incl. finial
  const fullW = r.width * 0.84;
  const towerW = fullW * 0.32;
  const wingW = (fullW - towerW) / 2;
  const left = cx - fullW / 2;
  const towerLeft = cx - towerW / 2;
  const towerRight = cx + towerW / 2;
  const wingH = T * 0.56;
  const wingTop = baseY - wingH;
  const towerBodyTop = baseY - T * 0.84;
  const bodyH = baseY - towerBodyTop;
  const crenH = CELL * 0.26;
  const sh = CELL * 0.12; // right-edge shading width
  return (
    <g className="massing library">
      <ellipse className="bshadow" cx={cx} cy={baseY + 2} rx={fullW * 0.56} ry={CELL * 0.22} />
      {/* plinth */}
      <rect className="sand-dark" x={left - CELL * 0.3} y={baseY - CELL * 0.42} width={fullW + CELL * 0.6} height={CELL * 0.42} />
      {/* wings + central tower (honey sandstone) */}
      <rect className="sand" x={left} y={wingTop} width={wingW} height={wingH} />
      <rect className="sand" x={towerRight} y={wingTop} width={wingW} height={wingH} />
      <rect className="sand" x={towerLeft} y={towerBodyTop} width={towerW} height={bodyH} />
      {/* subtle right-edge shading for depth */}
      <rect className="sand-dark" x={left + wingW - sh} y={wingTop} width={sh} height={wingH} />
      <rect className="sand-dark" x={towerRight + wingW - sh} y={wingTop} width={sh} height={wingH} />
      <rect className="sand-dark" x={towerRight - sh} y={towerBodyTop} width={sh} height={bodyH} />
      {/* tower string-courses (the stacked tiers) */}
      {[0.32, 0.54, 0.76].map((f, i) => (
        <rect key={`sc${i}`} className="sand-dark" x={towerLeft} y={baseY - bodyH * f} width={towerW} height={CELL * 0.13} />
      ))}
      {/* Gothic lancet windows */}
      {lancet(cx - towerW * 0.22, towerW * 0.44, baseY - bodyH * 0.12, bodyH * 0.3, 'tw')}
      {[0, 1].map((i) => lancet(left + wingW * (0.22 + i * 0.4), wingW * 0.22, baseY - wingH * 0.16, wingH * 0.56, `lw${i}`))}
      {[0, 1].map((i) => lancet(towerRight + wingW * (0.22 + i * 0.4), wingW * 0.22, baseY - wingH * 0.16, wingH * 0.56, `rw${i}`))}
      {/* battlemented rooflines */}
      {battlements(left, wingW, wingTop, crenH, 'bl')}
      {battlements(towerRight, wingW, wingTop, crenH, 'br')}
      {battlements(towerLeft, towerW, towerBodyTop, crenH, 'bt')}
      {/* central pinnacle / finial */}
      <polygon className="sand" points={`${cx - CELL * 0.24},${towerBodyTop - crenH} ${cx + CELL * 0.24},${towerBodyTop - crenH} ${cx},${baseY - T}`} />
    </g>
  );
}

// Layer 4: every tall object, z-sorted (north→south) so fronts paint on top.
export function Buildings({ world }: { world: World }) {
  const drawables = buildingsZSorted(world);
  return (
    <g className="buildings">
      {drawables.map((d, i) => {
        if (d.kind === 'house' && d.block) return <BlockScape key={`b${i}`} block={d.block} world={world} />;
        if (d.kind === 'park' && d.place) return <ParkTrees key={`b${i}`} place={d.place} world={world} />;
        if (d.kind === 'library' && d.place) return <Library key={`b${i}`} place={d.place} world={world} />;
        if (d.kind === 'civic' && d.place) return <Massing key={`b${i}`} place={d.place} world={world} />;
        return null;
      })}
    </g>
  );
}
