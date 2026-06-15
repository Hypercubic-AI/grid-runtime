import type { RunResult, Dir } from './types';

export interface Verdict {
  pass: boolean;
  reason: string;
}

export function judge(
  result: RunResult,
  expected?: { cell: [number, number]; facing: Dir },
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
  if (result.final.facing !== expected.facing) {
    return { pass: false, reason: `Facing ${result.final.facing}; expected ${expected.facing}` };
  }
  if (result.outcome !== 'arrived') {
    return { pass: false, reason: 'Never issued ARRIVE' };
  }
  return { pass: true, reason: 'Arrived at the intended doorstep' };
}
