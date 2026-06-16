export type Dir = 'N' | 'E' | 'S' | 'W';

export type Instruction =
  | { op: 'MOVE'; n: number }
  | { op: 'TURN'; dir: 'LEFT' | 'RIGHT' }
  | { op: 'REPEAT'; count: number; body: Instruction[] }
  | { op: 'ARRIVE' };

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

export interface World {
  name: string;
  width: number; // cells along x (0..width-1), x increases East
  height: number; // cells along y (0..height-1), y increases North
  block: number; // road spacing; a cell is road if x%block===0 || y%block===0
  walls: [number, number][];
  oneways?: OneWay[];
  start: StartState;
}

export interface Scenario {
  world: string;
  start: StartState;
  expected?: { cell: [number, number]; facing: Dir };
}

export type FrameStatus = 'start' | 'moved' | 'turned' | 'arrived' | 'crashed';

export interface Frame {
  cell: [number, number];
  facing: Dir;
  status: FrameStatus;
  reason?: string;
}

export interface RunResult {
  frames: Frame[];
  outcome: 'arrived' | 'crashed' | 'ended';
  final: Frame;
}
