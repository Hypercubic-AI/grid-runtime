import { describe, it, expect } from 'vitest';
import { parseText } from '@/lib/isa';

const ok = (src: string) => {
  const r = parseText(src);
  expect(r.diagnostics).toEqual([]);
  return r.instructions;
};
const firstError = (src: string) => {
  const r = parseText(src);
  expect(r.diagnostics.length).toBeGreaterThan(0);
  return r.diagnostics[0];
};

describe('parseText — valid programs', () => {
  it('parses a flat program with comments and blank lines', () => {
    const ins = ok('# go\nMOVE 30\nTURN LEFT\n\nARRIVE');
    expect(ins).toEqual([
      { op: 'MOVE', n: 30, line: 2 },
      { op: 'TURN', dir: 'LEFT', line: 3 },
      { op: 'ARRIVE', line: 5 },
    ]);
  });

  it('parses nested REPEAT and records the line of each node', () => {
    const ins = ok('REPEAT 4 {\n  MOVE 10\n  TURN RIGHT\n}\nARRIVE');
    expect(ins).toEqual([
      {
        op: 'REPEAT',
        count: 4,
        line: 1,
        body: [
          { op: 'MOVE', n: 10, line: 2 },
          { op: 'TURN', dir: 'RIGHT', line: 3 },
        ],
      },
      { op: 'ARRIVE', line: 5 },
    ]);
  });

  it('allows a trailing comment after a statement', () => {
    expect(ok('MOVE 5 # five east')).toEqual([{ op: 'MOVE', n: 5, line: 1 }]);
  });
});

describe('parseText — error classes', () => {
  it('rejects an unknown opcode', () => {
    expect(firstError('FLY 3').message).toMatch(/unknown instruction "FLY"/);
  });
  it('rejects MOVE with a missing operand', () => {
    expect(firstError('MOVE\nARRIVE').message).toMatch(/MOVE expects a count/);
  });
  it('rejects a non-integer operand', () => {
    expect(firstError('MOVE 2.5').message).toMatch(/invalid operand/);
  });
  it('rejects MOVE 0 (count must be >= 1)', () => {
    expect(firstError('MOVE 0').message).toMatch(/must be ≥ 1|invalid operand/);
  });
  it('rejects a negative operand', () => {
    expect(firstError('MOVE -3').message).toMatch(/must be ≥ 1|invalid operand/);
  });
  it('rejects REPEAT 0', () => {
    expect(firstError('REPEAT 0 { MOVE 1 }').message).toMatch(/must be ≥ 1|invalid operand/);
  });
  it('rejects TURN without a direction', () => {
    expect(firstError('TURN UP').message).toMatch(/TURN expects LEFT or RIGHT/);
  });
  it('rejects REPEAT without an opening brace', () => {
    expect(firstError('REPEAT 3 MOVE 1').message).toMatch(/REPEAT expects "{"/);
  });
  it('rejects an unclosed brace', () => {
    expect(firstError('REPEAT 3 {\n  MOVE 1').message).toMatch(/unclosed/);
  });
  it('rejects a stray closing brace', () => {
    expect(firstError('MOVE 1\n}').message).toMatch(/unexpected "}"/);
  });
  it('reports the offending line number', () => {
    expect(firstError('MOVE 1\nFLY 2').line).toBe(2);
  });
  it('produces character offsets usable by a linter', () => {
    const d = firstError('MOVE 2.5');
    expect(d.to).toBeGreaterThan(d.from);
    expect(d.severity).toBe('error');
  });
});
