import type { RunResult } from '@/lib/types';
import type { Verdict } from '@/lib/verdict';

export function Status({ result, verdict }: { result: RunResult; verdict: Verdict | null }) {
  const { outcome } = result;
  const cls = `status${outcome === 'arrived' ? ' arrived' : outcome === 'crashed' ? ' crashed' : ''}`;
  const label =
    outcome === 'crashed' ? 'Crashed' : outcome === 'arrived' ? 'Arrived' : result.frames.length <= 1 ? 'Ready' : 'Finished';

  return (
    <div className={cls}>
      <span className="pill" />
      {verdict ? (
        <span>
          <span className={verdict.pass ? 'pass' : 'fail'}>{verdict.pass ? 'PASS' : 'FAIL'}</span>
          {!verdict.pass && <span style={{ color: 'var(--muted)' }}> — {verdict.reason}</span>}
        </span>
      ) : (
        <span>
          {label}
          {outcome === 'crashed' && result.final.reason ? ` — ${result.final.reason}` : ''}
        </span>
      )}
    </div>
  );
}
