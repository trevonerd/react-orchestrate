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
    <aside className="timeline" aria-label="Choreography progress">
      <p className="timeline-title">Choreography v2</p>
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
          Stop
        </button>
      )}
      {isPerforming && (
        <p className="timeline-hint">Sit tight — the page is being guided</p>
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
        {isPerforming ? "Running…" : "Replay demo"}
      </button>
      <p className="replay-hint">
        Each component registers its step. One <code>execute()</code> coordinates them
        all.
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
        {open ? "Hide" : "When to use OrchestRate vs modern alternatives"}
      </button>

      {open && (
        <div className="alternatives-grid">
          <article className="alt-card alt-card--yes">
            <h3>Use OrchestRate</h3>
            <ul>
              <li>Multiple sibling components contribute to the same flow</li>
              <li>Guided onboarding: scroll → data → UI → scroll</li>
              <li>Register steps on mount, execute in batch</li>
              <li>Priority, delays, and async step ordering</li>
            </ul>
          </article>

          <article className="alt-card">
            <h3>Single useEffect + async/await</h3>
            <p>
              Simpler when the entire flow lives in <strong>one component</strong>. For
              a short linear sequence, OrchestRate is overkill.
            </p>
          </article>

          <article className="alt-card">
            <h3>View Transitions (React canary)</h3>
            <p>
              Great for <strong>state/page animations</strong>, not for imperative
              scroll → fetch → message sequences.
            </p>
          </article>

          <article className="alt-card">
            <h3>TanStack Query / Suspense</h3>
            <p>
              Perfect for <strong>loading data</strong>, not for orchestrating scroll or
              multi-component step flows.
            </p>
          </article>

          <article className="alt-card">
            <h3>XState / state machine</h3>
            <p>
              Better for flows with <strong>branching</strong> (if/else, retry, complex
              states). More verbose.
            </p>
          </article>

          <article className="alt-card">
            <h3>GSAP ScrollTrigger / CSS scroll-driven</h3>
            <p>
              Industry standard for scroll-linked animations. They do not handle fetch or
              cross-component UI updates.
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
