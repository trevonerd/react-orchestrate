import { useState } from "react";
import {
  OrchestRateProvider,
  scrollIntoView,
  scrollTo,
  useOrchestRate,
  useOrchestRateStep,
} from "../lib";
import "./demo.css";

interface Quote {
  id: number;
  title: string;
  body: string;
}

function HeroSection() {
  return (
    <section className="hero" id="hero">
      <p className="eyebrow">OrchestRate demo</p>
      <h1>Coreografia di pagina in React</h1>
      <p className="lead">
        Apri la pagina, scorri, carica un&apos;API, aggiorna un messaggio e scorri di
        nuovo — tutto orchestrato con priorità.
      </p>
    </section>
  );
}

function IntroScrollStep() {
  useOrchestRateStep(
    "scroll-to-content",
    async () => {
      await scrollIntoView("#content-section", { settleMs: 700 });
      return { scrolledTo: "content-section" };
    },
    { priority: 100, preDelay: 400 },
  );

  return null;
}

function FetchQuoteStep({ onStatus }: { onStatus: (text: string) => void }) {
  useOrchestRateStep(
    "fetch-quote",
    async () => {
      onStatus("Caricamento citazione...");
      const quote = await fetch("https://jsonplaceholder.typicode.com/posts/7").then(
        (response) => {
          if (!response.ok) throw new Error("API non disponibile");
          return response.json() as Promise<Quote>;
        },
      );
      return quote;
    },
    { priority: 80, postDelay: 300 },
  );

  return null;
}

function MessageStep({
  message,
  onMessage,
}: {
  message: string;
  onMessage: (text: string) => void;
}) {
  useOrchestRateStep(
    "update-message",
    async ({ get }) => {
      const quote = get<Quote>("fetch-quote");
      if (!quote) throw new Error("Citazione non trovata");
      const text = `«${quote.title}» — ${quote.body.slice(0, 80)}...`;
      onMessage(text);
      return { message: text };
    },
    { priority: 60 },
  );

  return (
    <div className="message-card" id="message-card">
      <p className="message-label">Messaggio orchestrato</p>
      <p className="message-text">{message || "In attesa della coreografia..."}</p>
    </div>
  );
}

function FinalScrollStep() {
  useOrchestRateStep(
    "scroll-to-footer",
    async () => {
      await scrollTo(document.body.scrollHeight, { settleMs: 800 });
      return { scrolledTo: "footer" };
    },
    { priority: 40, preDelay: 500 },
  );

  return null;
}

function Controls() {
  const { execute, isPerforming } = useOrchestRate();

  return (
    <div className="controls">
      <button
        type="button"
        className="btn"
        disabled={isPerforming}
        onClick={() => execute().catch(console.error)}
      >
        {isPerforming ? "Orchestrazione in corso..." : "Riproduci coreografia"}
      </button>
    </div>
  );
}

export function ChoreographyDemo() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Pronto");

  return (
    <OrchestRateProvider debug autoExecute autoExecuteDelay={300}>
      <IntroScrollStep />
      <FetchQuoteStep onStatus={setStatus} />
      <main className="page">
        <HeroSection />
        <p className="status-bar">Stato: {status}</p>
        <Controls />

        <section className="content" id="content-section">
          <h2>Sezione contenuto</h2>
          <p>
            Dopo l&apos;apertura, OrchestRate scorre qui automaticamente, poi carica i
            dati e aggiorna il messaggio sotto.
          </p>
          <MessageStep message={message} onMessage={setMessage} />
        </section>

        <FinalScrollStep />

        <footer className="footer" id="footer">
          <p>Coreografia completata — sei in fondo alla pagina.</p>
        </footer>
      </main>
    </OrchestRateProvider>
  );
}
