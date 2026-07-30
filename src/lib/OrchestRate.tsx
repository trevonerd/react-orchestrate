import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createOrchestrator } from "./createOrchestrator";
import type {
  EffectFunction,
  OrchestRateContextValue,
  OrchestRateProviderProps,
  OrchestrateOptions,
  UseOrchestRateStepOptions,
} from "./types";

const OrchestRateContext = createContext<OrchestRateContextValue | null>(null);

export function OrchestRateProvider({
  children,
  debug = false,
  autoExecute = false,
  autoExecuteDelay = 0,
}: OrchestRateProviderProps) {
  const orchestratorRef = useRef(createOrchestrator(debug));
  const [isPerforming, setIsPerforming] = useState(false);
  const autoExecutedRef = useRef(false);

  useEffect(() => () => orchestratorRef.current.dispose(), []);

  const orchestrate = useCallback(
    (id: string, effect: EffectFunction, options?: OrchestrateOptions) => {
      orchestratorRef.current.orchestrate(id, effect, options);
    },
    [],
  );

  const execute = useCallback(async () => {
    setIsPerforming(true);
    try {
      return await orchestratorRef.current.execute();
    } finally {
      setIsPerforming(orchestratorRef.current.isPerforming);
    }
  }, []);

  const cancel = useCallback((id: string) => {
    orchestratorRef.current.cancel(id);
  }, []);

  useEffect(() => {
    if (!autoExecute || autoExecutedRef.current) return;

    autoExecutedRef.current = true;
    const timer = setTimeout(() => {
      execute().catch((error: unknown) => {
        if (debug) console.error("[OrchestRate] autoExecute failed", error);
      });
    }, autoExecuteDelay);

    return () => clearTimeout(timer);
  }, [autoExecute, autoExecuteDelay, debug, execute]);

  const value: OrchestRateContextValue = {
    orchestrate,
    execute,
    cancel,
    isPerforming,
  };

  return (
    <OrchestRateContext.Provider value={value}>{children}</OrchestRateContext.Provider>
  );
}

export function useOrchestRate(): OrchestRateContextValue {
  const context = useContext(OrchestRateContext);
  if (!context) {
    throw new Error("useOrchestRate must be used within OrchestRateProvider");
  }
  return context;
}

/**
 * Register a choreographed step on mount. Cleans up by cancelling the step on unmount.
 */
export function useOrchestRateStep(
  id: string,
  effect: EffectFunction,
  options: UseOrchestRateStepOptions = {},
) {
  const { orchestrate, execute, cancel } = useOrchestRate();
  const {
    autoExecute: stepAutoExecute = false,
    priority,
    preDelay,
    postDelay,
    timeout,
  } = options;

  const effectRef = useRef(effect);
  effectRef.current = effect;

  const optionsRef = useRef({ priority, preDelay, postDelay, timeout });
  optionsRef.current = { priority, preDelay, postDelay, timeout };

  useEffect(() => {
    orchestrate(id, (context) => effectRef.current(context), optionsRef.current);

    if (stepAutoExecute) {
      execute().catch(console.error);
    }

    return () => cancel(id);
  }, [id, orchestrate, execute, cancel, stepAutoExecute]);
}
