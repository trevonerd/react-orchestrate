import { useState } from "react";
import { scrollIntoView } from "../lib";
import { useTourStep } from "./tour-progress";

interface UserProfile {
  id: number;
  name: string;
  company: { catchPhrase: string };
}

interface Product {
  id: number;
  title: string;
}

/** Step 1 — vive nel layout hero, scroll verso il catalogo */
export function HeroScrollStep() {
  useTourStep(
    "scroll-catalog",
    "Scroll alla sezione catalogo",
    async () => {
      await scrollIntoView("#catalog", { settleMs: 500 });
      return { target: "catalog" };
    },
    { priority: 100, preDelay: 300 },
  );
  return null;
}

/** Step 2 — vive nel ProductGrid, fetch indipendente */
export function ProductFetchStep({
  onLoading,
}: {
  onLoading: (v: boolean) => void;
}) {
  useTourStep(
    "fetch-products",
    "Carica prodotti dall'API",
    async () => {
      onLoading(true);
      const products = await fetch(
        "https://jsonplaceholder.typicode.com/posts?_limit=3",
      ).then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json() as Promise<Product[]>;
      });
      onLoading(false);
      return products;
    },
    { priority: 80 },
  );
  return null;
}

/** Step 3 — stesso componente del grid, usa risultato del fetch */
export function ProductRevealStep({
  onHighlight,
}: {
  onHighlight: (title: string) => void;
}) {
  useTourStep(
    "reveal-product",
    "Evidenzia prodotto in evidenza",
    async ({ get }) => {
      const products = get<Product[]>("fetch-products");
      const featured = products?.[0];
      if (!featured) throw new Error("Nessun prodotto");
      onHighlight(featured.title);
      await new Promise((r) => setTimeout(r, 400));
      return { featuredId: featured.id };
    },
    { priority: 70 },
  );
  return null;
}

/** Step 4 — componente separato MessageBanner, fetch profilo utente */
export function ProfileFetchStep() {
  useTourStep(
    "fetch-profile",
    "Carica profilo utente",
    async () => {
      const profile = await fetch("https://jsonplaceholder.typicode.com/users/1").then(
        (r) => {
          if (!r.ok) throw new Error("API error");
          return r.json() as Promise<UserProfile>;
        },
      );
      return profile;
    },
    { priority: 60 },
  );
  return null;
}

/** Step 5 — MessageBanner aggiorna messaggio con dati da step precedenti */
export function PersonalizedMessageStep({
  onMessage,
}: {
  onMessage: (text: string) => void;
}) {
  useTourStep(
    "personalize-message",
    "Messaggio personalizzato",
    async ({ get }) => {
      const profile = get<UserProfile>("fetch-profile");
      const products = get<Product[]>("fetch-products");
      const name = profile?.name ?? "utente";
      const count = products?.length ?? 0;
      const text = `Ciao ${name.split(" ")[0]}! Abbiamo selezionato ${count} prodotti per te.`;
      onMessage(text);
      return { text };
    },
    { priority: 50, postDelay: 400 },
  );
  return null;
}

/** Step 6 — CtaSection, scroll finale */
export function CtaScrollStep() {
  useTourStep(
    "scroll-cta",
    "Scroll alla call-to-action",
    async () => {
      await scrollIntoView("#cta", { settleMs: 600 });
      return { target: "cta" };
    },
    { priority: 40, preDelay: 200 },
  );
  return null;
}

export function ProductGrid() {
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  return (
    <section className="catalog" id="catalog">
      <ProductFetchStep onLoading={setLoading} />
      <ProductRevealStep onHighlight={setHighlight} />

      <header className="section-header">
        <p className="eyebrow">Catalogo</p>
        <h2>Prodotti consigliati</h2>
      </header>

      <div className={`product-grid ${loading ? "product-grid--loading" : ""}`}>
        {[1, 2, 3].map((n) => (
          <article
            key={n}
            className={`product-card ${highlight && n === 1 ? "product-card--featured" : ""}`}
          >
            {loading ? (
              <div className="skeleton" />
            ) : (
              <>
                <h3>{n === 1 && highlight ? highlight : `Prodotto ${n}`}</h3>
                <p>Caricato e orchestrato da componenti separati.</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessageBanner() {
  const [message, setMessage] = useState("In attesa della coreografia…");

  return (
    <section className="message-banner" id="message">
      <ProfileFetchStep />
      <PersonalizedMessageStep onMessage={setMessage} />

      <div className="message-banner-inner">
        <p className="message-banner-label">Messaggio orchestrato</p>
        <p className="message-banner-text">{message}</p>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="cta" id="cta">
      <CtaScrollStep />
      <h2>Pronto a provarlo nel tuo progetto?</h2>
      <p>Tre righe per registrare un passo. Un provider. Zero dipendenze runtime.</p>
      <code className="code-snippet">
        useOrchestRateStep(&apos;scroll&apos;, async () =&gt; scrollTo(400), {"{"}{" "}
        priority: 100 {"}"})
      </code>
    </section>
  );
}

export function PerfectDemoPage() {
  return (
    <main className="demo-page">
      <HeroScrollStep />

      <header className="hero">
        <p className="eyebrow">OrchestRate · demo perfetta</p>
        <h1>Onboarding guidato in 6 passi</h1>
        <p className="lead">
          Apri la pagina e guarda: scroll automatico, due fetch API da componenti
          diversi, messaggio personalizzato, scroll finale. Ogni blocco registra il
          proprio passo — nessun mega-<code>useEffect</code> centrale.
        </p>
        <div className="hero-flow">
          <span>Scroll</span>
          <span aria-hidden>→</span>
          <span>API prodotti</span>
          <span aria-hidden>→</span>
          <span>Highlight</span>
          <span aria-hidden>→</span>
          <span>API profilo</span>
          <span aria-hidden>→</span>
          <span>Messaggio</span>
          <span aria-hidden>→</span>
          <span>CTA</span>
        </div>
      </header>

      <ProductGrid />
      <MessageBanner />
      <CtaSection />

      <footer className="demo-footer">
        <p>Coreografia completata.</p>
      </footer>
    </main>
  );
}
