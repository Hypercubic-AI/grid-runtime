// Token colours must go through `style` (SVG presentation attributes don't resolve CSS vars).
const f = (v: string) => ({ fill: `var(${v})` });
const s = (v: string, w = 1.6) => ({ fill: 'none', stroke: `var(${v})`, strokeWidth: w });

function Icon({ kind }: { kind: string }) {
  switch (kind) {
    case 'start':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <circle cx="9" cy="8" r="5" style={s('--amber', 2)} />
          <circle cx="9" cy="8" r="1.6" style={f('--amber')} />
        </svg>
      );
    case 'goal':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <circle cx="9" cy="8" r="6" style={s('--amber-soft', 1.6)} />
          <circle cx="9" cy="8" r="2.4" style={s('--amber-soft', 1.6)} />
        </svg>
      );
    case 'road':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <rect x="1" y="5" width="16" height="6" rx="1" fill="#3a352a" />
          <line x1="2.5" y1="8" x2="15.5" y2="8" stroke="#5a5440" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case 'house':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <rect x="5" y="7" width="8" height="6" style={f('--wall')} />
          <polygon points="4,7 14,7 9,2.5" style={f('--roof-a')} />
          <rect x="8" y="9" width="2.4" height="3" style={f('--window')} />
        </svg>
      );
    case 'park':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <rect x="8.2" y="9" width="1.6" height="4" style={f('--trunk')} />
          <circle cx="9" cy="7" r="4" style={f('--foliage-dark')} />
          <circle cx="8" cy="6" r="2.6" style={f('--foliage')} />
        </svg>
      );
    case 'library':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <rect x="3" y="6" width="12" height="7" style={f('--sand')} />
          {[3, 6.5, 10, 13.4].map((x) => <rect key={x} x={x} y="4.6" width="1.6" height="1.7" style={f('--sand')} />)}
          <rect x="8" y="9" width="2" height="3.6" style={f('--glass')} />
          <polygon points="8,9 10,9 9,7" style={f('--glass')} />
        </svg>
      );
    case 'civic':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <polygon points="3,7 15,7 9,3" style={f('--stone')} />
          <rect x="4" y="7" width="10" height="6" style={f('--stone-dark')} />
          {[5.4, 8, 10.6].map((x) => <rect key={x} x={x} y="8" width="1.4" height="5" style={f('--column')} />)}
        </svg>
      );
    case 'constr':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <rect x="2" y="4" width="14" height="8" rx="1.5" style={{ fill: '#1f1812', stroke: 'var(--red)', strokeWidth: 1 }} />
          {[3, 7, 11].map((x) => <line key={x} x1={x} y1="11.5" x2={x + 4} y2="4.5" stroke="var(--red)" strokeWidth="1.6" />)}
        </svg>
      );
    case 'oneway':
      return (
        <svg className="ic" viewBox="0 0 18 16" aria-hidden>
          <polygon points="9,3 14,9 11,9 11,13 7,13 7,9 4,9" style={f('--sky')} />
        </svg>
      );
    default:
      return null;
  }
}

const ITEMS: [string, string][] = [
  ['start', 'start'],
  ['goal', 'goal'],
  ['road', 'road'],
  ['house', 'house'],
  ['park', 'park'],
  ['library', 'library'],
  ['civic', 'civic'],
  ['constr', 'construction'],
  ['oneway', 'one-way'],
];

export function Legend() {
  return (
    <div className="legend">
      {ITEMS.map(([kind, label]) => (
        <span className="it" key={label}>
          <Icon kind={kind} />
          {label}
        </span>
      ))}
    </div>
  );
}
