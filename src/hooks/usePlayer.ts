'use client';
import { useEffect, useState } from 'react';
import type { Frame } from '@/lib/types';

export interface Player {
  frame: Frame;
  index: number;
  total: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  step: () => void;
}

export function usePlayer(frames: Frame[], fps = 14): Player {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((n) => Math.min(n + 1, frames.length - 1)), 1000 / fps);
    return () => clearTimeout(t);
  }, [playing, index, frames, fps]);

  const clamp = (n: number) => Math.max(0, Math.min(n, frames.length - 1));

  return {
    frame: frames[index] ?? frames[0],
    index,
    total: frames.length,
    playing,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    replay: () => {
      setIndex(0);
      setPlaying(true);
    },
    step: () => {
      setPlaying(false);
      setIndex((n) => clamp(n + 1));
    },
  };
}
