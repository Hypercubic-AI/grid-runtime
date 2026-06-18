'use client';
import { useRef } from 'react';
import type { Player } from '@/hooks/usePlayer';

const SPEEDS = [0.5, 1, 2, 4];

export function Transport({ player }: { player: Player }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frac = player.total > 1 ? player.index / (player.total - 1) : 0;

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || player.total <= 1) return;
    const rect = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    player.seek(Math.round(f * (player.total - 1)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) seekFromClientX(e.clientX);
  };

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(player.speed);
    player.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  return (
    <div className="transport">
      <div className="tctrls">
        <button className="tbtn" onClick={player.toStart} aria-label="To start" title="To start (Home)">⏮</button>
        <button className="tbtn" onClick={player.stepBack} aria-label="Step back" title="Step back (←)">‹</button>
        <button className="tbtn play" onClick={player.toggle} aria-label={player.playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
          {player.playing ? '❚❚' : '▶'}
        </button>
        <button className="tbtn" onClick={player.step} aria-label="Step forward" title="Step forward (→)">›</button>
        <button className="tbtn" onClick={player.toEnd} aria-label="To end" title="To end (End)">⏭</button>
      </div>
      <div className="scrub">
        <div className="track" ref={trackRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
          <div className="fill" style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      <button className="speed" onClick={cycleSpeed} title="Playback speed">{player.speed}×</button>
      <span className="frame tnum">
        Frame <b>{Math.min(player.index + 1, player.total)}</b> / {player.total}
      </span>
    </div>
  );
}
