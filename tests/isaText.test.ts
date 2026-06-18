import { describe, it, expect } from 'vitest';
import { instructionsToText, textToInstructions } from '@/lib/isaText';
import { parseText } from '@/lib/isa';

describe('instructionsToText', () => {
  it('serializes flat and nested programs with 2-space indentation', () => {
    const text = instructionsToText([
      { op: 'REPEAT', count: 4, body: [{ op: 'MOVE', n: 10 }, { op: 'TURN', dir: 'LEFT' }] },
      { op: 'MOVE', n: 20 },
      { op: 'ARRIVE' },
    ]);
    expect(text).toBe('REPEAT 4 {\n  MOVE 10\n  TURN LEFT\n}\nMOVE 20\nARRIVE');
  });
});

describe('semantic round-trip', () => {
  const strip = (ins: import('@/lib/types').Instruction[]): unknown =>
    JSON.parse(JSON.stringify(ins, (k, v) => (k === 'line' ? undefined : v)));

  it('instructions -> text -> instructions is identity (ignoring lines)', () => {
    const original = [
      { op: 'REPEAT' as const, count: 3, body: [{ op: 'MOVE' as const, n: 5 }] },
      { op: 'ARRIVE' as const },
    ];
    const round = parseText(instructionsToText(original)).instructions;
    expect(strip(round)).toEqual(strip(original));
  });

  it('textToInstructions throws on the first diagnostic', () => {
    expect(() => textToInstructions('MOVE 0')).toThrow(/operand/);
  });
});
