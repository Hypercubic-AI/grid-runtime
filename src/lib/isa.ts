import type { Instruction, Diagnostic, ParseResult } from './types';

const KEYWORDS = new Set(['MOVE', 'TURN', 'REPEAT', 'ARRIVE']);
const DIRECTIONS = new Set(['LEFT', 'RIGHT']);

interface Tok {
  text: string;
  line: number; // 1-based
  from: number; // absolute offset
  to: number;
}

// Split into tokens: words, single braces. Drops `#` comments to end-of-line.
// Tracks absolute character offsets so diagnostics can underline precisely.
function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  const lines = src.split('\n');
  let offset = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '#') break; // comment runs to EOL
      if (/\s/.test(ch)) {
        i++;
        continue;
      }
      if (ch === '{' || ch === '}') {
        toks.push({ text: ch, line: li + 1, from: offset + i, to: offset + i + 1 });
        i++;
        continue;
      }
      let j = i;
      while (j < line.length && !/\s/.test(line[j]) && line[j] !== '{' && line[j] !== '}' && line[j] !== '#') j++;
      toks.push({ text: line.slice(i, j), line: li + 1, from: offset + i, to: offset + j });
      i = j;
    }
    offset += line.length + 1; // account for the consumed '\n'
  }
  return toks;
}

// The one numeric rule, shared with parseJson: counts are integers >= 1.
function validCount(text: string): number | 'nan' | 'range' {
  if (!/^-?\d+$/.test(text)) return 'nan';
  const n = parseInt(text, 10);
  return n < 1 ? 'range' : n;
}

export function parseText(src: string): ParseResult {
  const toks = tokenize(src);
  const diagnostics: Diagnostic[] = [];
  let pos = 0;
  const eofOffset = src.length;
  const eofLine = src.split('\n').length;

  const peek = (): Tok | undefined => toks[pos];
  const at = (offset: number, line: number, message: string) =>
    diagnostics.push({ from: offset, to: offset, line, message, severity: 'error' });
  const errTok = (t: Tok, message: string) =>
    diagnostics.push({ from: t.from, to: t.to, line: t.line, message, severity: 'error' });
  const errHere = (message: string) => {
    const t = peek();
    if (t) errTok(t, message);
    else at(eofOffset, eofLine, message);
  };

  function readCount(what: string): number | null {
    const t = peek();
    if (!t || t.text === '{' || t.text === '}' || KEYWORDS.has(t.text) || DIRECTIONS.has(t.text)) {
      errHere(`${what} expects a count`);
      return null;
    }
    pos++;
    const v = validCount(t.text);
    if (v === 'nan') {
      errTok(t, `invalid operand "${t.text}" — expected a positive integer`);
      return null;
    }
    if (v === 'range') {
      errTok(t, `invalid operand "${t.text}" — count must be ≥ 1`);
      return null;
    }
    return v;
  }

  function parseStatement(): Instruction[] {
    const t = toks[pos++];
    const line = t.line;
    switch (t.text) {
      case 'MOVE': {
        const n = readCount('MOVE');
        return n === null ? [] : [{ op: 'MOVE', n, line }];
      }
      case 'TURN': {
        const d = peek();
        if (!d || !DIRECTIONS.has(d.text)) {
          errHere('TURN expects LEFT or RIGHT');
          return [];
        }
        pos++;
        return [{ op: 'TURN', dir: d.text as 'LEFT' | 'RIGHT', line }];
      }
      case 'ARRIVE':
        return [{ op: 'ARRIVE', line }];
      case 'REPEAT': {
        const count = readCount('REPEAT');
        const open = peek();
        if (!open || open.text !== '{') {
          errHere('REPEAT expects "{"');
          return [];
        }
        pos++; // consume '{'
        const body = parseBlock(true);
        const close = peek();
        if (!close || close.text !== '}') errTok(t, 'unclosed "{"');
        else pos++; // consume '}'
        return count === null ? [] : [{ op: 'REPEAT', count, body, line }];
      }
      default:
        errTok(t, `unknown instruction "${t.text}"`);
        return [];
    }
  }

  function parseBlock(insideBraces: boolean): Instruction[] {
    const out: Instruction[] = [];
    while (pos < toks.length) {
      const t = peek()!;
      if (t.text === '}') {
        if (insideBraces) break;
        errTok(t, 'unexpected "}"');
        pos++;
        continue;
      }
      out.push(...parseStatement());
    }
    return out;
  }

  const instructions = parseBlock(false);
  return { instructions, diagnostics };
}
