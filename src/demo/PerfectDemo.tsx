import { useState } from "react";
import { OrchestRateProvider, useOrchestRate, useOrchestRateProgress } from "../lib";
import "./demo.css";
import { PerfectDemoPage } from "./PerfectDemoPage";
import { TourProgressProvider, useTourProgress } from "./tour-progress";

function StepTimeline() {
  const { steps } = useTourProgress();
  const { isPerforming, abort } = useOrchestRate();
  const progress = useOrchestRateProgress();

  return (
    <aside className="timeline" aria-label="Progresso coreografia">
      <p className="timeline-title">Coreografia v2</p>
      <div className="progress-bar" aria-hidden>
        <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="progress-percent">{progress.percent}%</p>
      <ol className="timeline-list">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`timeline-item timeline-item--${step.status}`}
            data-active={step.status === "running"}
          >
            <span className="timeline-index">{index + 1}</span>
            <span className="timeline-label">{step.label}</span>
            <span className="timeline-status">{statusLabel(step.status)}</span>
          </li>
        ))}
      </ol>
      {isPerforming && (
        <button type="button" className="btn btn-abort" onClick={() => abort()}>
          Interrompi
        </button>
      )}
      {isPerforming && (
        <p className="timeline-hint">Non scrollare — sta guidando la pagina</p>
      )}
    </aside>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "running":
      return "…";
    case "done":
      return "✓";
    case "error":
      return "!";
    default:
      return "";
  }
}

function ReplayBar() {
  const { execute, isPerforming } = useOrchestRate();
  const { resetSteps } = useTourProgress();

  return (
    <div className="replay-bar">
      <button
        type="button"
        className="btn btn-primary"
        disabled={isPerforming}
        onClick={() => {
          resetSteps();
          execute().catch(console.error);
        }}
      >
        {isPerforming ? "Guida in corso…" : "Rigioca la demo"}
      </button>
      <p className="replay-hint">
        Ogni componente registra il suo passo. Un solo <code>execute()</code> li
        coordina.
      </p>
    </div>
  );
}

function AlternativesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="alternatives" id="alternatives">
      <button
        type="button"
        className="alternatives-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Nascondi" : "Quando usare OrchestRate vs alternative moderne"}
      </button>

      {open && (
        <div className="alternatives-grid">
          <article className="alt-card alt-card--yes">
            <h3>Usa OrchestRate</h3>
            <ul>
              <li>Più componenti fratelli contribuiscono allo stesso flusso</li>
              <li>Onboarding guidato: scroll → dati → UI → scroll</li>
              <li>Vuoi registrare passi al mount ed eseguire in batch</li>
              <li>Priorità e delay tra step async</li>
            </ul>
          </article>

          <article className="alt-card">
            <h3>Un solo useEffect + async/await</h3>
            <p>
              Più semplice se tutto il flusso vive in <strong>un componente</strong>.
              Per 4 righe di sequenza, OrchestRate è overkill.
            </p>
          </article>

          <article className="alt-card">
            <h3>View Transitions (React canary)</h3>
            <p>
              Ottimo per <strong>animazioni tra stati/pagine</strong>, non per sequenze
              imperative scroll → fetch → messaggio.
            </p>
          </article>

          <article className="alt-card">
            <h3>TanStack Query / Suspense</h3>
            <p>
              Perfetti per <strong>caricare dati</strong>, non orchestrano scroll o
              passi multipli tra componenti.
            </p>
          </article>

          <article className="alt-card">
            <h3>XState / state machine</h3>
            <p>
              Meglio per flussi con <strong>ramificazioni</strong> (if/else, retry,
              stati complessi). Più verboso.
            </p>
          </article>

          <article className="alt-card">
            <h3>GSAP ScrollTrigger / CSS scroll-driven</h3>
            <p>
              Standard per animazioni legate allo scroll. Non gestiscono fetch o
              aggiornamento UI tra componenti.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}

export function PerfectDemo() {
  return (
    <OrchestRateProvider autoExecute autoExecuteDelay={500}>
      <TourProgressProvider>
        <StepTimeline />
        <PerfectDemoPage />
        <div className="page-footer-actions">
          <ReplayBar />
          <AlternativesPanel />
        </div>
      </TourProgressProvider>
    </OrchestRateProvider>
  );
}
