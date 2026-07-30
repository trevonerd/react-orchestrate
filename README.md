# OrchestRate

Orchestra flussi di pagina in React con semplicità: scroll, fetch API, aggiornamento UI — nell'ordine che decidi tu.

**Zero dipendenze runtime.** Compatibile con React 18 e 19.

## Il problema

Hai una pagina dove, all'apertura, vuoi:

1. Scorrere fino a una sezione
2. Caricare un'API
3. Aggiornare un messaggio in base alla risposta
4. Scorrere di nuovo

Con `useEffect` sparsi nei componenti perdi il controllo sull'ordine. Con XState o redux-saga è overkill. **OrchestRate** è il mezzo: registri i passi, li esegui in ordine di priorità.

## Installazione

```bash
npm install react-orchestrate
```

## Uso rapido

```tsx
import {
  OrchestRateProvider,
  scrollIntoView,
  scrollTo,
  useOrchestRateStep,
} from 'react-orchestrate';

function App() {
  return (
    <OrchestRateProvider autoExecute autoExecuteDelay={300}>
      <ScrollStep />
      <FetchStep />
      <MessageStep />
      <FinalScrollStep />
    </OrchestRateProvider>
  );
}

function ScrollStep() {
  useOrchestRateStep(
    'scroll-intro',
    async () => scrollIntoView('#content'),
    { priority: 100 },
  );
  return null;
}

function FetchStep() {
  useOrchestRateStep(
    'fetch-data',
    async () => {
      const res = await fetch('/api/quote');
      return res.json();
    },
    { priority: 80 },
  );
  return null;
}

function MessageStep() {
  const [msg, setMsg] = useState('');
  useOrchestRateStep(
    'show-message',
    async ({ get }) => {
      const data = get<{ title: string }>('fetch-data');
      setMsg(data?.title ?? '');
    },
    { priority: 60 },
  );
  return <p>{msg}</p>;
}

function FinalScrollStep() {
  useOrchestRateStep(
    'scroll-end',
    async () => scrollTo(document.body.scrollHeight),
    { priority: 40 },
  );
  return null;
}
```

## API

### `OrchestRateProvider`

| Prop | Tipo | Default | Descrizione |
|------|------|---------|-------------|
| `debug` | `boolean` | `false` | Log in console |
| `autoExecute` | `boolean` | `false` | Esegue tutti i passi registrati al mount |
| `autoExecuteDelay` | `number` | `0` | Ritardo prima di `autoExecute` (ms) |

### `useOrchestRate()`

Restituisce `{ orchestrate, execute, cancel, isPerforming }`.

- **`orchestrate(id, effect, options?)`** — registra un passo
- **`execute()`** — esegue tutti i passi per priorità (decrescente), restituisce i risultati
- **`cancel(id)`** — rimuove un passo dalla registrazione

### `useOrchestRateStep(id, effect, options?)`

Registra un passo al mount e lo cancella allo smontaggio. Opzioni:

| Opzione | Default | Descrizione |
|---------|---------|-------------|
| `priority` | `0` | Priorità più alta = eseguito prima |
| `preDelay` | `0` | Attesa prima dell'effetto (ms) |
| `postDelay` | `0` | Attesa dopo l'effetto (ms) |
| `timeout` | — | Timeout massimo (ms) |
| `autoExecute` | `false` | Esegue subito dopo la registrazione |

### `EffectContext`

Ogni effetto riceve un contesto con i risultati dei passi già eseguiti:

```ts
async ({ results, get }) => {
  const prev = get<MyType>('step-id');
}
```

### Helper (opzionali)

- `scrollTo(top, options?)` — scroll finestra con attesa animazione
- `scrollIntoView(selector, options?)` — scroll a elemento
- `fetchJson<T>(url)` — fetch JSON tipizzato

## Sviluppo

```bash
npm install
npm run dev      # demo locale
npm run build    # build libreria (dist/)
npm run test:run # test
npm run lint     # biome
```

## Licenza

MIT
