import { describe, it, expect } from 'vitest';
import { judge } from '@/lib/verdict';
import type { RunResult } from '@/lib/types';

const arrived = (cell: [number, number], facing: 'N' | 'E' | 'S' | 'W'): RunResult => ({
  frames: [],
  outcome: 'arrived',
  final: { cell, facing, status: 'arrived' },
});

describe('verdict', () => {
  it('returns null when there is no expected target', () => {
    expect(judge(arrived([1, 1], 'N'))).toBeNull();
  });
  it('passes when cell, facing, and arrival all match', () => {
    expect(judge(arrived([42, 30], 'S'), { cell: [42, 30], facing: 'S' })?.pass).toBe(true);
  });
  it('fails on wrong cell', () => {
    const v = judge(arrived([41, 30], 'S'), { cell: [42, 30], facing: 'S' });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/41,30/);
  });
  it('fails on wrong facing', () => {
    const v = judge(arrived([42, 30], 'N'), { cell: [42, 30], facing: 'S' });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/facing/i);
  });
  it('fails when the robot crashed', () => {
    const crashed: RunResult = {
      frames: [],
      outcome: 'crashed',
      final: { cell: [2, 0], facing: 'E', status: 'crashed', reason: 'drove into construction' },
    };
    const v = judge(crashed, { cell: [42, 30], facing: 'S' });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/construction/);
  });
  it('fails when ARRIVE was never issued', () => {
    const ended: RunResult = {
      frames: [],
      outcome: 'ended',
      final: { cell: [42, 30], facing: 'S', status: 'moved' },
    };
    const v = judge(ended, { cell: [42, 30], facing: 'S' });
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/ARRIVE/);
  });
});
