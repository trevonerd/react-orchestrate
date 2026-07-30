# Recipe: Landing narrativa

Scroll progressivo con step condizionale (solo prima visita).

```tsx
useOrchestRateStep(
  'intro-scroll',
  () => scrollIntoView('#story'),
  { phase: 1, when: () => !sessionStorage.getItem('seen-story') },
);

useOrchestRateStep(
  'mark-seen',
  () => { sessionStorage.setItem('seen-story', '1'); },
  { after: ['intro-scroll'], once: true },
);
```

Usa `persist: true` per salvare su localStorage invece di sessionStorage manuale.
