'use client';
import type { Player } from '@/hooks/usePlayer';
import type { RunResult } from '@/lib/types';
import type { Verdict } from '@/lib/verdict';

export function Controls({
  player,
  result,
  verdict,
}: {
  player: Player;
  result: RunResult;
  verdict: Verdict | null;
}) {
  const statusText =
    result.outcome === 'crashed'
      ? `Crashed — ${result.final.reason}`
      : result.outcome === 'arrived'
        ? 'Arrived'
        : 'Finished';
  const statusCls = `status${
    result.outcome === 'crashed' ? ' crashed' : result.outcome === 'arrived' ? ' arrived' : ''
  }`;

  return (
    <aside className="panel">
      <p className="wordmark">Controls</p>
      <div className="btn-row">
        <button className={player.playing ? 'active' : ''} onClick={player.playing ? player.pause : player.play}>
          {player.playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={player.step}>Step</button>
        <button onClick={player.replay}>Replay</button>
      </div>
      <div className="counter">
        Frame {player.index + 1} / {player.total}
      </div>
      <div className={statusCls}>{statusText}</div>
      {verdict && (
        <div className={`verdict ${verdict.pass ? 'pass' : 'fail'}`}>
          <span className="word">{verdict.pass ? 'PASS' : 'FAIL'}</span>
          <span className="why">{verdict.reason}</span>
        </div>
      )}
    </aside>
  );
}
