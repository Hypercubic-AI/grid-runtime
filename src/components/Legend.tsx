const ITEMS = [
  { cls: 'start', label: 'start' },
  { cls: 'goal', label: 'goal' },
  { cls: 'road', label: 'road' },
  { cls: 'building', label: 'building' },
  { cls: 'constr', label: 'construction' },
  { cls: 'oneway', label: 'one-way' },
];

export function Legend() {
  return (
    <div className="legend">
      {ITEMS.map((it) => (
        <span className="it" key={it.label}>
          <span className={`sw ${it.cls}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
