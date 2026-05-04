export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="eyebrow">Frontend Setup</span>
        <h1>Das React-Frontend ist startklar.</h1>
        <p>
          Dieser Ordner ist jetzt als echtes React-/Vite-Projekt vorbereitet und kann von euch als Basis
          fuer Board, Ticket-Modal und Dashboard verwendet werden.
        </p>

        <div className="next-steps">
          <article className="step-card">
            <h2>Naechster Schritt</h2>
            <p>App-Layout mit Navigation fuer Board und Dashboard aufbauen.</p>
          </article>
          <article className="step-card">
            <h2>Ordnerstruktur</h2>
            <p>`components`, `pages`, `services`, `features/tickets` und `styles` sind bereits vorbereitet.</p>
          </article>
          <article className="step-card">
            <h2>Start</h2>
            <p>`npm.cmd install` und danach `npm.cmd run dev` im `frontend`-Ordner ausfuehren.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
