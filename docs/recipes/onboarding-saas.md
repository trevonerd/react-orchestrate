# Recipe: Onboarding guidato SaaS

Flusso tipico: scroll → fetch paralleli → messaggio → CTA.

```tsx
import {
  OrchestRateProvider,
  scrollIntoView,
  useOrchestRateStep,
} from 'react-orchestrate';

export function Onboarding() {
  return (
    <OrchestRateProvider autoExecute autoExecuteDelay={400}>
      <ScrollToFeatures />
      <FetchUserData />
      <FetchCatalog />
      <WelcomeMessage />
      <ScrollToCta />
    </OrchestRateProvider>
  );
}

function ScrollToFeatures() {
  useOrchestRateStep('scroll', () => scrollIntoView('#features'), { phase: 1 });
  return null;
}

function FetchUserData() {
  useOrchestRateStep('user', () => fetch('/api/me').then(r => r.json()), { phase: 2 });
  return null;
}

function FetchCatalog() {
  useOrchestRateStep('catalog', () => fetch('/api/items').then(r => r.json()), { phase: 2 });
  return null;
}

function WelcomeMessage() {
  const [msg, setMsg] = useState('');
  useOrchestRateStep(
    'welcome',
    ({ get }) => {
      const user = get<{ name: string }>('user');
      setMsg(`Benvenuto, ${user?.name}!`);
    },
    { after: ['user', 'catalog'] },
  );
  return <p>{msg}</p>;
}
```
