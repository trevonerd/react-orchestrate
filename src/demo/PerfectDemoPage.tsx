import { useState } from "react";
import { scrollIntoView } from "../lib";
import { DEMO_PACE, withMinDuration } from "./demo-pace";
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
    "Scroll to catalog section",
    async () => {
      await scrollIntoView("#catalog", { settleMs: DEMO_PACE.scrollSettleMs });
      return { target: "catalog" };
    },
    { phase: 1, preDelay: DEMO_PACE.pauseLongMs, postDelay: DEMO_PACE.pauseMediumMs },
  );
  return null;
}

/** Phase 2 — parallel fetches (same phase) */
export function ProductFetchStep({
  onLoading,
}: {
  onLoading: (v: boolean) => void;
}) {
  useTourStep(
    "fetch-products",
    "Load products (parallel)",
    async () => {
      onLoading(true);
      const products = await withMinDuration(
        fetch("https://jsonplaceholder.typicode.com/posts?_limit=3").then((r) => {
          if (!r.ok) throw new Error("API error");
          return r.json() as Promise<Product[]>;
        }),
        DEMO_PACE.minLoadingMs,
      );
      onLoading(false);
      return products;
    },
    { phase: 2, preDelay: DEMO_PACE.pauseShortMs, postDelay: DEMO_PACE.pauseMediumMs },
  );
  return null;
}

export function ProfileFetchStep() {
  useTourStep(
    "fetch-profile",
    "Load profile (parallel)",
    async () => {
      return withMinDuration(
        fetch("https://jsonplaceholder.typicode.com/users/1").then((r) => {
          if (!r.ok) throw new Error("API error");
          return r.json() as Promise<UserProfile>;
        }),
        DEMO_PACE.minLoadingMs,
      );
    },
    { phase: 2, preDelay: DEMO_PACE.pauseShortMs, postDelay: DEMO_PACE.pauseMediumMs },
  );
  return null;
}

/** Explicit dependencies via `after` */
export function ProductRevealStep({
  onHighlight,
}: {
  onHighlight: (title: string) => void;
}) {
  useTourStep(
    "reveal-product",
    "Highlight featured product",
    async ({ get }) => {
      const products = get<Product[]>("fetch-products");
      const featured = products?.[0];
      if (!featured) throw new Error("No products found");
      onHighlight(featured.title);
      await new Promise((r) => setTimeout(r, DEMO_PACE.revealHoldMs));
      return { featuredId: featured.id };
    },
    { after: ["fetch-products"], preDelay: DEMO_PACE.pauseShortMs, postDelay: DEMO_PACE.pauseMediumMs },
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
    "Personalized message via get()",
    async ({ get }) => {
      const profile = get<UserProfile>("fetch-profile");
      const products = get<Product[]>("fetch-products");
      const name = profile?.name ?? "there";
      const text = `Hey ${name.split(" ")[0]}! ${products?.length ?? 0} products ready for you.`;
      onMessage(text);
      return { text };
    },
    {
      after: ["fetch-profile", "fetch-products"],
      preDelay: DEMO_PACE.pauseShortMs,
      postDelay: DEMO_PACE.pauseLongMs,
    },
  );
  return null;
}

export function CtaScrollStep() {
  useTourStep(
    "scroll-cta",
    "Scroll to call-to-action",
    async () => {
      await scrollIntoView("#cta", { settleMs: DEMO_PACE.scrollSettleMs });
      return { target: "cta" };
    },
    { phase: 4, preDelay: DEMO_PACE.pauseLongMs, postDelay: DEMO_PACE.pauseMediumMs },
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
        <p className="eyebrow">Catalog · phase 2 parallel</p>
        <h2>Recommended products</h2>
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
                <h3>{n === 1 && highlight ? highlight : `Product ${n}`}</h3>
                <p>Parallel fetch + reveal with after[]</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessageBanner() {
  const [message, setMessage] = useState("Waiting for choreography…");

  return (
    <section className="message-banner" id="message">
      <ProfileFetchStep />
      <PersonalizedMessageStep onMessage={setMessage} />

      <div className="message-banner-inner">
        <p className="message-banner-label">Orchestrated message</p>
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
      <p>Two parallel APIs (phase 2), then message with after[], then scroll.</p>
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
        <h1>Guided onboarding, done right</h1>
        <p className="lead">
          Scroll → <strong>2 parallel APIs</strong> → highlight → message with{" "}
          <code>after[]</code> → scroll to CTA. Each component registers its own step.
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
        <p>Choreography complete.</p>
      </footer>
    </main>
  );
}
