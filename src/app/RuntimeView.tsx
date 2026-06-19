'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { World, Scenario, Instruction } from '@/lib/types';
import { execute } from '@/lib/executor';
import { judge, judgeLegs } from '@/lib/verdict';
import { isTraversable } from '@/lib/world';
import { parseText, parseJson, instructionsToText } from '@/lib/isa';
import { useDirectionsPoll } from '@/hooks/useDirectionsPoll';
import { usePlayer } from '@/hooks/usePlayer';
import { CityGrid } from '@/components/CityGrid';
import { Robot } from '@/components/Robot';
import { Trail } from '@/components/Trail';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Transport } from '@/components/Transport';
import { Status } from '@/components/Status';
import { Legend } from '@/components/Legend';
import { Editor } from '@/components/Editor';
import worldData from '@/data/worlds/downtown.json';
import spiralRaw from '@/data/samples/spiral.json';
import detourRaw from '@/data/samples/detour.json';
import loopRaw from '@/data/samples/loop.json';

const WORLD = worldData as World;
const SAMPLES: Record<string, unknown> = { spiral: spiralRaw, detour: detourRaw, loop: loopRaw };

function toEditable(raw: unknown): { text: string; scenario: Scenario | null } {
  const { instructions } = parseJson(raw);
  const scenario = (raw as { scenario?: Scenario })?.scenario ?? null;
  return { text: instructionsToText(instructions), scenario };
}

interface Committed {
  instructions: Instruction[];
  scenario: Scenario | null;
  runId: number;
}

const initial = toEditable(SAMPLES.spiral);

export default function RuntimeView() {
  const [text, setText] = useState(initial.text);
  const [scenario, setScenario] = useState<Scenario | null>(initial.scenario);
  const [sample, setSample] = useState('spiral'); // selected sample, or '' when a non-sample source is loaded
  const [fname, setFname] = useState('spiral.grid'); // the editor "file" label (sample, watched file, or upload)
  const [committed, setCommitted] = useState<Committed>(() => ({
    instructions: parseText(initial.text).instructions,
    scenario: initial.scenario,
    runId: 0,
  }));
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseText(text), [text]);
  const ok = parsed.diagnostics.length === 0;
  const firstErr = parsed.diagnostics[0];
  const isEmpty = text.trim() === '';

  const commit = (instructions: Instruction[], sc: Scenario | null) =>
    setCommitted((c) => ({ instructions, scenario: sc, runId: c.runId + 1 }));

  const run = () => {
    if (!ok) return;
    commit(parsed.instructions, scenario);
  };

  const loadSample = (name: string) => {
    const e = toEditable(SAMPLES[name]);
    setSample(name);
    setFname(`${name}.grid`);
    setText(e.text);
    setScenario(e.scenario);
    commit(parseText(e.text).instructions, e.scenario);
  };

  const start =
    committed.scenario?.start &&
    isTraversable(WORLD, committed.scenario.start.cell[0], committed.scenario.start.cell[1])
      ? committed.scenario.start
      : WORLD.start;

  const result = useMemo(() => execute(WORLD, start, { instructions: committed.instructions }), [committed, start]);
  const verdict = useMemo(
    () =>
      committed.scenario?.expected_legs
        ? judgeLegs(result, committed.scenario.expected_legs)
        : judge(result, committed.scenario?.expected),
    [result, committed],
  );

  const hasProgram = committed.instructions.length > 0;
  const player = usePlayer(result.frames, { autoPlay: hasProgram });
  const activeLine = result.frames[player.index]?.line ?? null;

  const legs = committed.scenario?.expected_legs;
  const goal = !hasProgram ? null : legs ? legs[legs.length - 1].cell : committed.scenario?.expected?.cell ?? null;
  const waypoints = hasProgram && legs ? legs.slice(0, -1).map((l) => l.cell) : [];

  // Emptying the editor resets the stage to the neutral resting state (spec §7.5):
  // commit an empty program so the trail/goal clear, the robot returns to start,
  // and the hint shows. (Typing then leaves the stage at rest until the next Run.)
  useEffect(() => {
    if (isEmpty && committed.instructions.length > 0) {
      setCommitted((c) => ({ instructions: [], scenario: null, runId: c.runId + 1 }));
    }
  }, [isEmpty, committed.instructions.length]);

  // file-watch: apply only real updates (mtime > 0), into the editor + run
  const watch = useDirectionsPoll({ instructions: committed.instructions });
  const lastMtime = useRef(0);
  useEffect(() => {
    if (watch.mtimeMs && watch.mtimeMs !== lastMtime.current) {
      lastMtime.current = watch.mtimeMs;
      const instrs = watch.directions.instructions as Instruction[];
      setText(instructionsToText(instrs));
      setScenario(watch.scenario ?? null);
      setSample('');
      setFname('directions.json');
      commit(instrs, watch.scenario ?? null);
    }
  }, [watch]);

  // keyboard transport — ignored while the editor is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as Element | null;
      if (el && el.closest('.code-host')) return;
      if (e.key === ' ') {
        e.preventDefault();
        player.toggle();
      } else if (e.key === 'ArrowLeft') player.stepBack();
      else if (e.key === 'ArrowRight') player.step();
      else if (e.key === 'Home') player.toStart();
      else if (e.key === 'End') player.toEnd();
      else if (e.key === 'r' || e.key === 'R') player.toStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    setSample('');
    setFname(file.name);
    try {
      const ed = toEditable(JSON.parse(raw));
      setText(ed.text);
      setScenario(ed.scenario);
      commit(parseText(ed.text).instructions, ed.scenario);
    } catch {
      setText(raw); // plain ISA text; user presses Run
      setScenario(null);
    }
    e.target.value = '';
  };

  const onPasteJson = async () => {
    try {
      const ed = toEditable(JSON.parse(await navigator.clipboard.readText()));
      setText(ed.text);
      setScenario(ed.scenario);
      setSample('');
      setFname('pasted.json');
      commit(parseText(ed.text).instructions, ed.scenario);
    } catch {
      alert('Clipboard did not contain valid directions JSON.');
    }
  };

  return (
    <>
      <Header />
      <main>
        <section className="stage">
          <div className="stage-head">
            <div className="eyebrow tnum" style={{ marginLeft: 'auto' }}>
              Grid {WORLD.width} × {WORLD.height}
            </div>
          </div>
          <div className="stage-card">
            <CityGrid world={WORLD} start={start.cell} goal={goal} waypoints={waypoints}>
              <Trail frames={result.frames} index={player.index} worldHeight={WORLD.height} />
              <Robot
                cell={player.frame.cell}
                facing={player.frame.facing}
                worldHeight={WORLD.height}
                status={player.frame.status}
              />
            </CityGrid>
            {!hasProgram && <div className="stage-hint">Write a program or load a sample</div>}
          </div>
          <Transport player={player} />
          <div className="statusrow">
            <Status result={result} verdict={verdict} />
            <Legend />
          </div>
        </section>

        <section className="editor">
          <div className="ed-head">
            <span className="eyebrow">Program</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select className="select" value={sample} onChange={(e) => loadSample(e.target.value)}>
                <option value="" disabled>
                  sample…
                </option>
                <option value="spiral">spiral</option>
                <option value="detour">detour</option>
                <option value="loop">loop</option>
              </select>
              <button className="run" onClick={run} disabled={!ok || isEmpty}>
                ▶ Run
              </button>
            </div>
          </div>
          <div className="code">
            <div className="code-top">
              <div className="dots">
                <span className="d" />
                <span className="d" />
                <span className="d" />
              </div>
              <span className="fname">{fname}</span>
            </div>
            <Editor value={text} onChange={setText} onRun={run} activeLine={activeLine} />
          </div>
          <div className="ed-actions">
            <button className="sbtn" onClick={() => fileRef.current?.click()}>
              ↑ Upload
            </button>
            <button className="sbtn" onClick={onPasteJson}>
              ⎘ Paste JSON
            </button>
            <input ref={fileRef} type="file" accept=".json,.grid,.txt" hidden onChange={onUpload} />
          </div>
          <div className={`diag ${ok ? 'ok' : 'err'}`}>
            <span className="ic">{ok ? '✓' : '!'}</span>
            <div className="t">
              <div className="a">{!ok ? `Line ${firstErr.line}: ${firstErr.message}` : isEmpty ? 'Empty program' : 'No errors'}</div>
              <div className="b">
                {!ok ? 'Fix the error to run' : isEmpty ? 'Write a program or load a sample' : `${parsed.instructions.length} instructions ready`}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
