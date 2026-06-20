'use client';
import { useEffect, useState } from 'react';
import type { Frame } from '@/lib/types';

const BASE_FPS = 14;

export function clampIndex(i: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(i, total - 1));
}

export function fpsForSpeed(mult: number): number {
  return BASE_FPS * mult;
}

export interface Player {
  frame: Frame;
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  frameMs: number; // ms between frames at the current speed; sync the robot's CSS transition to this
  play: () => void;
  pause: () => void;
  toggle: () => void;
  toStart: () => void;
  toEnd: () => void;
  step: () => void;
  stepBack: () => void;
  seek: (i: number) => void;
  setSpeed: (mult: number) => void;
}

export function usePlayer(frames: Frame[], opts: { autoPlay?: boolean } = {}): Player {
  const autoPlay = opts.autoPlay ?? true;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  // New program/frames: rewind, and auto-play only if asked AND there is something to play.
  useEffect(() => {
    setIndex(0);
    setPlaying(autoPlay && frames.length > 1);
  }, [frames, autoPlay]);

  useEffect(() => {
    if (!playing) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((n) => clampIndex(n + 1, frames.length)), 1000 / fpsForSpeed(speed));
    return () => clearTimeout(t);
  }, [playing, index, frames, speed]);

  const clamp = (n: number) => clampIndex(n, frames.length);

  return {
    frame: frames[index] ?? frames[0],
    index,
    total: frames.length,
    playing,
    speed,
    frameMs: 1000 / fpsForSpeed(speed),
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    toStart: () => {
      setPlaying(false);
      setIndex(0);
    },
    toEnd: () => {
      setPlaying(false);
      setIndex(clamp(frames.length - 1));
    },
    step: () => {
      setPlaying(false);
      setIndex((n) => clamp(n + 1));
    },
    stepBack: () => {
      setPlaying(false);
      setIndex((n) => clamp(n - 1));
    },
    seek: (i: number) => {
      setPlaying(false);
      setIndex(clamp(i));
    },
    setSpeed: (mult: number) => setSpeed(mult),
  };
}
