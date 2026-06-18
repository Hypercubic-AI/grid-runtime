'use client';
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { isaLanguage, isaHighlight, isaLinter, isaTheme, activeLineField, setActiveLine } from '@/lib/isaEditor';

export function Editor({
  value,
  onChange,
  onRun,
  activeLine,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  activeLine: number | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  // Create the EditorView once (browser-only).
  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        isaLanguage,
        isaHighlight,
        isaLinter,
        lintGutter(),
        activeLineField,
        isaTheme,
        keymap.of([
          { key: 'Mod-Enter', run: () => (onRunRef.current(), true) },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push external value changes (sample load / JSON ingest) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Sync the robot's active source line.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setActiveLine.of(activeLine) });
  }, [activeLine]);

  return <div className="code-host" ref={hostRef} />;
}
