import type { World, Directions, Instruction, Dir, Frame, RunResult, StartState } from './types';
import { inBounds, isRoad, isTraversable, oneWayBlocks } from './world';

const DELTA: Record<Dir, [number, number]> = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
const LEFT: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

const MAX_WORK = 1_000_000; // total REPEAT-expansion steps before we abort
const MAX_DEPTH = 256; // maximum REPEAT nesting depth

class ProgramError extends Error {}

// Expand REPEAT into a flat list. Bounds *total work* — every loop step, not just
// emitted instructions — so an empty/REPEAT-only body with a huge count cannot spin
// forever; and bounds nesting depth so deep recursion cannot overflow the stack.
function flatten(instrs: Instruction[], out: Instruction[], depth: number, work: { n: number }): Instruction[] {
  if (depth > MAX_DEPTH) throw new ProgramError('the directions are nested too deeply');
  for (const ins of instrs) {
    if (++work.n > MAX_WORK) throw new ProgramError('the program is too large');
    if (ins.op === 'REPEAT') {
      const count = Math.max(0, Math.floor(ins.count));
      for (let i = 0; i < count; i++) {
        if (++work.n > MAX_WORK) throw new ProgramError('the program is too large');
        flatten(ins.body, out, depth + 1, work);
      }
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
    flat = flatten(directions.instructions ?? [], [], 0, { n: 0 });
  } catch (e) {
    const why = e instanceof ProgramError ? e.message : 'the directions could not be read';
    const f: Frame = { cell: [x, y], facing, status: 'crashed', reason: `couldn't run — ${why}` };
    frames.push(f);
    return { frames, outcome: 'crashed', final: f };
  }

  let outcome: RunResult['outcome'] = 'ended';

  outer: for (const ins of flat) {
    if (ins.op === 'TURN') {
      facing = ins.dir === 'LEFT' ? LEFT[facing] : RIGHT[facing];
      frames.push({ cell: [x, y], facing, status: 'turned', line: ins.line });
    } else if (ins.op === 'MOVE') {
      const [dx, dy] = DELTA[facing];
      const n = Math.max(0, Math.floor(ins.n));
      for (let i = 0; i < n; i++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!isTraversable(world, nx, ny)) {
          frames.push({ cell: [x, y], facing, status: 'crashed', reason: reasonFor(world, nx, ny), line: ins.line });
          outcome = 'crashed';
          break outer;
        }
        if (oneWayBlocks(world, nx, ny, facing)) {
          frames.push({ cell: [x, y], facing, status: 'crashed', reason: 'drove the wrong way down a one-way street', line: ins.line });
          outcome = 'crashed';
          break outer;
        }
        x = nx;
        y = ny;
        frames.push({ cell: [x, y], facing, status: 'moved', line: ins.line });
      }
    } else if (ins.op === 'ARRIVE') {
      frames.push({ cell: [x, y], facing, status: 'arrived', line: ins.line });
      outcome = 'arrived';
      break;
    } else {
      // Unknown / malformed opcode: fail loudly rather than silently no-op.
      const op = (ins as { op?: unknown }).op;
      frames.push({ cell: [x, y], facing, status: 'crashed', reason: `couldn't run — unknown instruction "${String(op)}"`, line: (ins as { line?: number }).line });
      outcome = 'crashed';
      break;
    }
  }

  return { frames, outcome, final: frames[frames.length - 1] };
}
