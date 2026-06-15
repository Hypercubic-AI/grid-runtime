import type { World, Directions, Instruction, Dir, Frame, RunResult, StartState } from './types';
import { inBounds, isRoad, isTraversable } from './world';

const DELTA: Record<Dir, [number, number]> = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
const LEFT: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

const MAX_INSTRUCTIONS = 100_000;

class ProgramTooLarge extends Error {}

// Expand REPEAT into a flat list, capping total size so a giant `count`
// cannot exhaust memory before execution begins.
function flatten(instrs: Instruction[], out: Instruction[] = []): Instruction[] {
  for (const ins of instrs) {
    if (out.length > MAX_INSTRUCTIONS) throw new ProgramTooLarge();
    if (ins.op === 'REPEAT') {
      const count = Math.max(0, Math.floor(ins.count));
      for (let i = 0; i < count; i++) flatten(ins.body, out);
    } else {
      out.push(ins);
    }
  }
  return out;
}

function reasonFor(world: World, x: number, y: number): string {
  if (!inBounds(world, x, y)) return 'drove off the edge of the grid';
  if (!isRoad(world, x, y)) return 'drove into a building';
  return 'drove into construction';
}

export function execute(world: World, start: StartState, directions: Directions): RunResult {
  let [x, y] = start.cell;
  let facing = start.facing;
  const frames: Frame[] = [{ cell: [x, y], facing, status: 'start' }];

  let flat: Instruction[];
  try {
    flat = flatten(directions.instructions ?? []);
  } catch {
    const f: Frame = { cell: [x, y], facing, status: 'crashed', reason: 'program too large' };
    frames.push(f);
    return { frames, outcome: 'crashed', final: f };
  }

  let outcome: RunResult['outcome'] = 'ended';

  outer: for (const ins of flat) {
    if (ins.op === 'TURN') {
      facing = ins.dir === 'LEFT' ? LEFT[facing] : RIGHT[facing];
      frames.push({ cell: [x, y], facing, status: 'turned' });
    } else if (ins.op === 'MOVE') {
      const [dx, dy] = DELTA[facing];
      const n = Math.max(0, Math.floor(ins.n));
      for (let i = 0; i < n; i++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!isTraversable(world, nx, ny)) {
          frames.push({ cell: [x, y], facing, status: 'crashed', reason: reasonFor(world, nx, ny) });
          outcome = 'crashed';
          break outer;
        }
        x = nx;
        y = ny;
        frames.push({ cell: [x, y], facing, status: 'moved' });
      }
    } else if (ins.op === 'ARRIVE') {
      frames.push({ cell: [x, y], facing, status: 'arrived' });
      outcome = 'arrived';
      break;
    }
  }

  return { frames, outcome, final: frames[frames.length - 1] };
}
