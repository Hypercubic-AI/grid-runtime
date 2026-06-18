import { describe, it, expect } from 'vitest';
import { judge, judgeLegs } from '@/lib/verdict';
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

  it('skips the facing check when expected omits facing (intersection/landmark targets)', () => {
    expect(judge(arrived([30, 30], 'E'), { cell: [30, 30] })?.pass).toBe(true);
  });
  it('still checks facing when expected provides it', () => {
    expect(judge(arrived([30, 30], 'E'), { cell: [30, 30], facing: 'S' })?.pass).toBe(false);
  });
});

describe('judgeLegs (multi-stop)', () => {
  const multi = (): RunResult => ({
    frames: [
      { cell: [10, 30], facing: 'E', status: 'start' },
      { cell: [20, 30], facing: 'E', status: 'moved' },
      { cell: [40, 30], facing: 'E', status: 'arrived' },
    ],
    outcome: 'arrived',
    final: { cell: [40, 30], facing: 'E', status: 'arrived' },
  });

  it('passes when each leg target is visited in order', () => {
    expect(judgeLegs(multi(), [{ cell: [20, 30] }, { cell: [40, 30] }])?.pass).toBe(true);
  });
  it('fails when an intermediate leg is never visited', () => {
    const v = judgeLegs(multi(), [{ cell: [99, 99] }, { cell: [40, 30] }]);
    expect(v?.pass).toBe(false);
    expect(v?.reason).toMatch(/leg 1/i);
  });
  it('fails when legs are visited out of order', () => {
    expect(judgeLegs(multi(), [{ cell: [40, 30] }, { cell: [20, 30] }])?.pass).toBe(false);
  });
});

describe('verdict — disguise-safe copy', () => {
  it('PASS reason is neutral and contains no address-domain words', () => {
    const v = judge(arrived([42, 30], 'S'), { cell: [42, 30], facing: 'S' });
    expect(v?.pass).toBe(true);
    expect(v?.reason).toBe('Reached the target');
    expect(v?.reason).not.toMatch(/doorstep|address|house/i);
  });
});
