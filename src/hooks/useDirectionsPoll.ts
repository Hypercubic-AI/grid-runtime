'use client';
import { useEffect, useState } from 'react';
import type { Directions, Scenario } from '@/lib/types';

export interface Run {
  directions: Directions;
  scenario?: Scenario;
  mtimeMs: number;
}

export function useDirectionsPoll(initial: Directions, intervalMs = 500): Run {
  const [run, setRun] = useState<Run>({ directions: initial, mtimeMs: 0 });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch('/api/directions', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.directions?.instructions && data.mtimeMs) {
            setRun((prev) =>
              data.mtimeMs !== prev.mtimeMs
                ? {
                    directions: data.directions as Directions,
                    scenario: (data.scenario as Scenario) ?? undefined,
                    mtimeMs: data.mtimeMs,
                  }
                : prev,
            );
          }
        }
      } catch {
        // ignore transient errors; keep polling
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };

    timer = setTimeout(tick, intervalMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return run;
}
