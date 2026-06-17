import type { RunResult, Dir } from './types';

export interface Verdict {
  pass: boolean;
  reason: string;
}

export function judge(
  result: RunResult,
  expected?: { cell: [number, number]; facing?: Dir },
): Verdict | null {
  if (!expected) return null;
  if (result.outcome === 'crashed') {
    return { pass: false, reason: `Robot ${result.final.reason ?? 'crashed'}` };
  }
  const [fx, fy] = result.final.cell;
  const [ex, ey] = expected.cell;
  if (fx !== ex || fy !== ey) {
    return { pass: false, reason: `Stopped at (${fx},${fy}); expected (${ex},${ey})` };
  }
  if (expected.facing !== undefined && result.final.facing !== expected.facing) {
    return { pass: false, reason: `Facing ${result.final.facing}; expected ${expected.facing}` };
  }
  if (result.outcome !== 'arrived') {
    return { pass: false, reason: 'Never issued ARRIVE' };
  }
  return { pass: true, reason: 'Arrived at the intended doorstep' };
}

// Multi-stop grading: each leg's target cell must be visited in order, and the
// robot must finish at the last leg (cell + facing-if-given + arrived).
export function judgeLegs(
  result: RunResult,
  legs: { cell: [number, number]; facing?: Dir }[],
): Verdict | null {
  if (!legs.length) return null;
  if (result.outcome === 'crashed') {
    return { pass: false, reason: `Robot ${result.final.reason ?? 'crashed'}` };
  }
  let i = 0;
  for (const f of result.frames) {
    if (i < legs.length && f.cell[0] === legs[i].cell[0] && f.cell[1] === legs[i].cell[1]) i++;
  }
  if (i < legs.length) {
    return { pass: false, reason: `Missed leg ${i + 1} at (${legs[i].cell[0]},${legs[i].cell[1]})` };
  }
  return judge(result, legs[legs.length - 1]);
}
