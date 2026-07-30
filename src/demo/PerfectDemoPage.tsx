import { useState } from "react";
import { scrollIntoView } from "../lib";
import { useTourStep } from "./tour-progress";

interface UserProfile {
  id: number;
  name: string;
}

interface Product {
  id: number;
  title: string;
}

export function HeroScrollStep() {
  useTourStep(
    "scroll-catalog",
    "Scroll alla sezione catalogo",
    async () => {
      await scrollIntoView("#catalog", { settleMs: 500 });
      return { target: "catalog" };
    },
    { phase: 1, preDelay: 300 },
  );
  return null;
}

/** Phase 2 — fetch in parallelo (stessa fase) */
export function ProductFetchStep({
  onLoading,
}: {
  onLoading: (v: boolean) => void;
}) {
  useTourStep(
    "fetch-products",
    "Carica prodotti (parallelo)",
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
    { phase: 2 },
  );
  return null;
}

export function ProfileFetchStep() {
  useTourStep(
    "fetch-profile",
    "Carica profilo (parallelo)",
    async () => {
      return fetch("https://jsonplaceholder.typicode.com/users/1").then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json() as Promise<UserProfile>;
      });
    },
    { phase: 2 },
  );
  return null;
}

/** Dipendenze esplicite con `after` */
export function ProductRevealStep({
  onHighlight,
}: {
  onHighlight: (title: string) => void;
}) {
  useTourStep(
    "reveal-product",
    "Evidenzia prodotto",
    async ({ get }) => {
      const products = get<Product[]>("fetch-products");
      const featured = products?.[0];
      if (!featured) throw new Error("Nessun prodotto");
      onHighlight(featured.title);
      await new Promise((r) => setTimeout(r, 300));
      return { featuredId: featured.id };
    },
    { after: ["fetch-products"] },
  );
  return null;
}

export function PersonalizedMessageStep({
  onMessage,
}: {
  onMessage: (text: string) => void;
}) {
  useTourStep(
    "personalize-message",
    "Messaggio con get() tipizzato",
    async ({ get }) => {
      const profile = get<UserProfile>("fetch-profile");
      const products = get<Product[]>("fetch-products");
      const name = profile?.name ?? "utente";
      const text = `Ciao ${name.split(" ")[0]}! ${products?.length ?? 0} prodotti pronti.`;
      onMessage(text);
      return { text };
    },
    { after: ["fetch-profile", "fetch-products"], postDelay: 300 },
  );
  return null;
}

export function CtaScrollStep() {
  useTourStep(
    "scroll-cta",
    "Scroll alla CTA",
    async () => {
      await scrollIntoView("#cta", { settleMs: 600 });
      return { target: "cta" };
    },
    { phase: 4, preDelay: 200 },
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
        <p className="eyebrow">Catalogo · phase 2 parallelo</p>
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
                <p>Fetch parallelo + reveal con after[]</p>
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
      <h2>v2.0 — after, phase, abort, progress</h2>
      <p>Due API in parallelo (phase 2), poi messaggio con after[], poi scroll.</p>
      <code className="code-snippet">
        {`useOrchestRateStep('msg', effect, {
  after: ['fetch-a', 'fetch-b'],
  retry: 2,
  when: () => !done,
})`}
      </code>
    </section>
  );
}

export function PerfectDemoPage() {
  return (
    <main className="demo-page">
      <HeroScrollStep />

      <header className="hero">
        <p className="eyebrow">OrchestRate v2</p>
        <h1>Onboarding guidato, fatto bene</h1>
        <p className="lead">
          Scroll → <strong>2 API in parallelo</strong> → highlight → messaggio con{" "}
          <code>after[]</code> → scroll CTA. Ogni componente registra il suo passo.
        </p>
        <div className="hero-flow">
          <span>phase 1 · scroll</span>
          <span aria-hidden>→</span>
          <span>phase 2 · API ×2 ∥</span>
          <span aria-hidden>→</span>
          <span>after · reveal + msg</span>
          <span aria-hidden>→</span>
          <span>phase 4 · CTA</span>
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
