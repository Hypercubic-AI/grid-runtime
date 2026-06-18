import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { Tag, tags as t } from '@lezer/highlight';
import { linter } from '@codemirror/lint';
import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { parseText } from './isa';

const tRepeat = Tag.define();
const tArrive = Tag.define();
const tDirection = Tag.define();

export const isaLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^[{}]/)) return 'brace';
    if (stream.match(/^-?\d+(?:\.\d+)?/)) return 'num';
    const m = stream.match(/^[A-Za-z_]+/) as RegExpMatchArray | null;
    if (m) {
      const w = m[0];
      if (w === 'MOVE' || w === 'TURN') return 'kw';
      if (w === 'REPEAT') return 'rep';
      if (w === 'ARRIVE') return 'arr';
      if (w === 'LEFT' || w === 'RIGHT') return 'dir';
      return null;
    }
    stream.next();
    return null;
  },
  tokenTable: {
    kw: t.keyword,
    rep: tRepeat,
    arr: tArrive,
    dir: tDirection,
    num: t.number,
    comment: t.lineComment,
    brace: t.brace,
  },
});

export const isaHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: 'var(--emerald)' },
    { tag: tRepeat, color: 'var(--violet)' },
    { tag: tArrive, color: 'var(--pink)' },
    { tag: t.number, color: 'var(--sky)' },
    { tag: tDirection, color: 'var(--amber-soft)' },
    { tag: t.lineComment, color: '#6f6757', fontStyle: 'italic' },
    { tag: t.brace, color: '#8a8270' },
  ]),
);

export const isaLinter = linter((view) => {
  const { diagnostics } = parseText(view.state.doc.toString());
  const len = view.state.doc.length;
  return diagnostics.map((d) => ({
    from: Math.min(d.from, len),
    to: Math.min(Math.max(d.from, d.to), len),
    severity: 'error' as const,
    message: d.message,
  }));
});

export const setActiveLine = StateEffect.define<number | null>();
const runLine = Decoration.line({ class: 'cm-activeRunLine' });

export const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setActiveLine)) {
        const ln = e.value;
        if (ln == null || ln < 1 || ln > tr.state.doc.lines) return Decoration.none;
        return Decoration.set([runLine.range(tr.state.doc.line(ln).from)]);
      }
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const isaTheme = EditorView.theme(
  {
    '&': { color: '#cbc3b6', backgroundColor: 'transparent', height: '100%', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.9' },
    '.cm-content': { padding: '14px 0' },
    '.cm-gutters': { backgroundColor: 'rgba(0,0,0,.18)', color: '#534b3e', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '.cm-activeRunLine': { backgroundColor: 'rgba(245,179,1,.08)', boxShadow: 'inset 2px 0 0 var(--amber)' },
    '.cm-cursor': { borderLeftColor: 'var(--amber-soft)' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);
