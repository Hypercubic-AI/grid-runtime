export function Header() {
  return (
    <header>
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- static white wordmark, no optimization needed */}
        <img src="/hypercubic_white_wordmark.svg" alt="Hypercubic" />
        <span className="divider" />
        <span className="app-name">Grid Runtime</span>
      </div>
      <div className="confidential">
        <span className="dot" />
        Confidential
      </div>
    </header>
  );
}
