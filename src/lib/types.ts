export type Dir = 'N' | 'E' | 'S' | 'W';

export type Instruction =
  | { op: 'MOVE'; n: number; line?: number }
  | { op: 'TURN'; dir: 'LEFT' | 'RIGHT'; line?: number }
  | { op: 'REPEAT'; count: number; body: Instruction[]; line?: number }
  | { op: 'ARRIVE'; line?: number };

export interface Directions {
  instructions: Instruction[];
}

export interface StartState {
  cell: [number, number];
  facing: Dir;
}

// A one-way road cell: travel through it is permitted only in `allow` (or
// perpendicular, i.e. turning onto it); travel in the opposite direction is a crash.
export interface OneWay {
  cell: [number, number];
  allow: Dir;
}

export type Footprint = [number, number, number, number]; // [x, y, w, h] interior rect (y increases North)

// A landmark/place. The shipped projection carries no name (disguise); see design §3.2.
export interface Place {
  type: 'park' | 'library' | 'civic';
  cell: [number, number];   // entrance: a road cell, edge-adjacent to a footprint cell
  footprint: Footprint;     // interior, non-road rectangle the renderer fills
}

export interface World {
  name: string;
  width: number; // cells along x (0..width-1), x increases East
  height: number; // cells along y (0..height-1), y increases North
  block: number; // road spacing; a cell is road if x%block===0 || y%block===0
  walls: [number, number][];
  oneways?: OneWay[];
  start: StartState;
  places?: Place[]; // NEW — semantic keys from a full file, if present, are ignored (not typed)
}

export interface Scenario {
  world: string;
  start: StartState;
  expected?: { cell: [number, number]; facing?: Dir };
  expected_legs?: { cell: [number, number]; facing?: Dir }[];
}

export type FrameStatus = 'start' | 'moved' | 'turned' | 'arrived' | 'crashed';

export interface Frame {
  cell: [number, number];
  facing: Dir;
  status: FrameStatus;
  reason?: string;
  line?: number;
}

export interface RunResult {
  frames: Frame[];
  outcome: 'arrived' | 'crashed' | 'ended';
  final: Frame;
}

// A parse/validation problem, shaped to map directly onto a CodeMirror lint Diagnostic.
export interface Diagnostic {
  from: number; // absolute character offset (start)
  to: number; // absolute character offset (end)
  line: number; // 1-based source line
  message: string;
  severity: 'error';
}

export interface ParseResult {
  instructions: Instruction[];
  diagnostics: Diagnostic[];
}
