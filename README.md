# OrchestRate v2

Orchestra flussi di pagina in React: scroll, fetch paralleli, messaggi, CTA — con dipendenze, fasi, retry e progress.

**~8 KB ESM · Zero dipendenze runtime · React 18 & 19**

## Live demo

**https://trevonerd.github.io/react-orchestrate/**

(GitHub Pages — enable under **Settings → Pages → Source: GitHub Actions** after merging to `main`.)

## Installazione

```bash
npm install react-orchestrate
```

## Quick start

```tsx
<OrchestRateProvider autoExecute>
  <ScrollStep />
  <FetchStep />
  <MessageStep />
</OrchestRateProvider>
```

## API v2

### Opzioni step (`useOrchestRateStep` / `orchestrate`)

| Opzione | Descrizione |
|---------|-------------|
| `after: string[]` | Dipendenze esplicite — esegue quando i passi sono completati |
| `phase: number` | Stessa fase = esecuzione **parallela** |
| `priority: number` | Ordine sequenziale (fallback senza `after`/`phase`) |
| `when: () => boolean` | Salta se false |
| `once: true` | Una volta per sessione |
| `persist: true \| string` | Salva completamento in localStorage |
| `retry` / `retryDelay` | Ritenta su errore |
| `waitFor: string` | Attende elemento DOM |
| `trigger: 'viewport'` | Registra quando elemento è visibile |
| `timeout` / `preDelay` / `postDelay` | Timing |

### Provider

```tsx
<OrchestRateProvider
  autoExecute
  debug
  onStepStart={(id) => analytics.track(id)}
  onComplete={(results) => console.log(results)}
>
```

### Hooks

- `useOrchestRate()` → `{ orchestrate, execute, cancel, abort, isPerforming, progress }`
- `useOrchestRateProgress()` → `{ percent, currentStep, completed, skipped, errored }`
- `useOrchestRateStep(id, effect, options)`

### Effect context

```ts
async ({ get, results, signal }) => {
  const data = get<MyType>('fetch-step');
  signal.aborted; // true se abort()
}
```

### Typed pipeline

```ts
import { definePipeline, pipelineStep } from 'react-orchestrate';

const tour = definePipeline({
  fetch: async () => ({ name: 'Marco' }),
  greet: async ({ get }) => `Ciao ${get('fetch')?.name}`,
});
```

### Helper

- `scrollTo`, `scrollIntoView`, `waitForElement`
- `withViewTransition(fn)` — View Transition API
- `fetchJson<T>(url)`

## Recipes

- [Onboarding SaaS](./docs/recipes/onboarding-saas.md)
- [Landing narrativa](./docs/recipes/narrative-landing.md)
- [Checkout wizard](./docs/recipes/checkout-wizard.md)

## Quando NON usarlo

Un solo `useEffect` con `async/await` basta se tutto il flusso è in un componente.  
Per animazioni scroll avanzate → GSAP. Per rami complessi → XState.

## Sviluppo

```bash
npm run dev          # http://localhost:5173
npm run build:demo   # static demo → demo-dist/
npm run test:run
npm run build        # library → dist/
```

### GitHub Pages

Push to `main` triggers `.github/workflows/deploy-demo.yml`. Then enable **Settings → Pages → GitHub Actions**.

Preview with the same base path as production:

```bash
GITHUB_PAGES=true npm run build:demo && npm run preview
```

## Licenza

MIT
