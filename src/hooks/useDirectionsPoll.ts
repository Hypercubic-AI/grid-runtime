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
    // The mtime observed on the first poll. A directions.json that already exists
    // when the app starts is treated as the baseline and ignored, so the app opens
    // on its sample — only a file (re)written *while the app is running* is loaded.
    let baseline: number | null = null;

    const tick = async () => {
      try {
        const res = await fetch('/api/directions', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const mtimeMs: number = data?.mtimeMs ?? 0;
          const hasDirections = !!data?.directions?.instructions;
          if (baseline === null) {
            baseline = hasDirections ? mtimeMs : 0; // first sight: remember, don't load
          } else if (hasDirections && mtimeMs > baseline) {
            setRun((prev) =>
              mtimeMs !== prev.mtimeMs
                ? {
                    directions: data.directions as Directions,
                    scenario: (data.scenario as Scenario) ?? undefined,
                    mtimeMs,
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
