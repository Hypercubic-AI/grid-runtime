const ITEMS = [
  { cls: 'start', label: 'start' },
  { cls: 'goal', label: 'goal' },
  { cls: 'road', label: 'road' },
  { cls: 'house', label: 'house' },
  { cls: 'park', label: 'park' },
  { cls: 'library', label: 'library' },
  { cls: 'civic', label: 'civic' },
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
