export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="eyebrow">Frontend Setup</span>
        <h1>Das React-Frontend ist startklar.</h1>
        <p>
          Dieser Ordner dient als React-/Vite-Projektgrundlage und kann als Basis für Board,
          Ticket-Modal und Dashboard genutzt werden.
        </p>

        <div className="next-steps">
          <article className="step-card">
            <h2>Nächster Schritt</h2>
            <p>App-Layout mit Navigation für Board und Dashboard aufbauen.</p>
          </article>
          <article className="step-card">
            <h2>Ordnerstruktur</h2>
            <p>`components`, `pages`, `services`, `features/tickets` und `styles` sind bereits vorbereitet.</p>
          </article>
          <article className="step-card">
            <h2>Start</h2>
            <p>`npm.cmd install` und danach `npm.cmd run dev` im `frontend`-Ordner ausführen.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
