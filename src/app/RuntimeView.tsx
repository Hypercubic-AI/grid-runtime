'use client';
import { useMemo } from 'react';
import type { World, Directions } from '@/lib/types';
import { execute } from '@/lib/executor';
import { judge } from '@/lib/verdict';
import { useDirectionsPoll } from '@/hooks/useDirectionsPoll';
import { usePlayer } from '@/hooks/usePlayer';
import { CityGrid } from '@/components/CityGrid';
import { Robot } from '@/components/Robot';
import { Trail } from '@/components/Trail';
import { Controls } from '@/components/Controls';
import worldData from '@/data/worlds/downtown.json';
import sample from '@/data/samples/loop.json';

const WORLD = worldData as World;

export default function RuntimeView() {
  const run = useDirectionsPoll(sample as Directions);
  const start = run.scenario?.start ?? WORLD.start;
  const result = useMemo(() => execute(WORLD, start, run.directions), [run, start]);
  const verdict = useMemo(() => judge(result, run.scenario?.expected), [result, run]);
  const player = usePlayer(result.frames);

  return (
    <main className="app">
      <div>
        <p className="wordmark">Grid Runtime</p>
        <CityGrid world={WORLD}>
          <Trail frames={result.frames} index={player.index} worldHeight={WORLD.height} />
          <Robot
            cell={player.frame.cell}
            facing={player.frame.facing}
            worldHeight={WORLD.height}
            status={player.frame.status}
          />
        </CityGrid>
      </div>
      <Controls player={player} result={result} verdict={verdict} />
    </main>
  );
}
