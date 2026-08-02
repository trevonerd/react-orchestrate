# Recipe: Wizard checkout

Pipeline nominata + `definePipeline` per type-safety.

```tsx
import { definePipeline, pipelineStep, useOrchestRate } from 'react-orchestrate';

const checkout = definePipeline({
  'validate-cart': async () => ({ valid: true }),
  'payment': async ({ get }) => {
    const cart = get('validate-cart');
    return fetch('/api/pay', { method: 'POST', body: JSON.stringify(cart) });
  },
  'confirm': async ({ get }) => get('payment'),
});

function CheckoutWizard() {
  const { orchestrate, execute } = useOrchestRate();

  useEffect(() => {
    orchestrate('validate-cart', checkout['validate-cart'], { pipeline: 'checkout' });
    orchestrate('payment', pipelineStep(checkout, 'payment', checkout.payment), {
      pipeline: 'checkout',
      after: ['validate-cart'],
      retry: 2,
    });
  }, []);

  return <button onClick={() => execute('checkout')}>Paga</button>;
}
```

Per flussi con molti rami condizionali, valuta XState. OrchestRate è ideale per pipeline lineari.
