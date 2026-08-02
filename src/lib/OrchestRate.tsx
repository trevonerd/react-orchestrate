import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createOrchestrator } from "./createOrchestrator";
import { isClient } from "./internal/storage";
import type {
  EffectFunction,
  OrchestRateCallbacks,
  OrchestRateContextValue,
  OrchestRateProgress,
  OrchestRateProviderProps,
  OrchestrateOptions,
  UseOrchestRateStepOptions,
} from "./types";

const defaultProgress: OrchestRateProgress = {
  isPerforming: false,
  currentStep: null,
  completed: [],
  skipped: [],
  errored: [],
  total: 0,
  percent: 0,
};

const OrchestRateContext = createContext<OrchestRateContextValue | null>(null);

export function OrchestRateProvider({
  children,
  pipeline: defaultPipeline = "default",
  debug = false,
  autoExecute = false,
  autoExecuteDelay = 0,
  ssrSafe = true,
  onStepStart,
  onStepComplete,
  onStepSkip,
  onStepError,
  onComplete,
  onProgress,
}: OrchestRateProviderProps) {
  const callbacksRef = useRef<OrchestRateCallbacks>({});
  callbacksRef.current = {
    onStepStart,
    onStepComplete,
    onStepSkip,
    onStepError,
    onComplete,
    onProgress,
  };

  const orchestratorRef = useRef(
    createOrchestrator({
      debug,
      onStepStart: (id) => callbacksRef.current.onStepStart?.(id),
      onStepComplete: (id, r) => callbacksRef.current.onStepComplete?.(id, r),
      onStepSkip: (id, r) => callbacksRef.current.onStepSkip?.(id, r),
      onStepError: (id, e) => callbacksRef.current.onStepError?.(id, e),
      onComplete: (r) => callbacksRef.current.onComplete?.(r),
      onProgress: (p) => {
        setProgressState(p);
        callbacksRef.current.onProgress?.(p);
      },
    }),
  );

  const [isPerforming, setIsPerforming] = useState(false);
  const [progress, setProgressState] = useState<OrchestRateProgress>(defaultProgress);
  const autoExecutedRef = useRef(false);
  const defaultPipelineRef = useRef(defaultPipeline);
  defaultPipelineRef.current = defaultPipeline;

  useEffect(() => () => orchestratorRef.current.dispose(), []);

  const orchestrate = useCallback(
    (id: string, effect: EffectFunction, options?: OrchestrateOptions) => {
      orchestratorRef.current.orchestrate(id, effect, {
        pipeline: defaultPipelineRef.current,
        ...options,
      });
    },
    [],
  );

  const execute = useCallback(async (pipe?: string) => {
    setIsPerforming(true);
    try {
      return await orchestratorRef.current.execute(pipe ?? defaultPipelineRef.current);
    } finally {
      setIsPerforming(orchestratorRef.current.isPerforming);
      setProgressState(orchestratorRef.current.getProgress());
    }
  }, []);

  const cancel = useCallback((id: string, pipe?: string) => {
    orchestratorRef.current.cancel(id, pipe ?? defaultPipelineRef.current);
  }, []);

  const abort = useCallback(() => {
    orchestratorRef.current.abort();
    setIsPerforming(false);
    setProgressState(orchestratorRef.current.getProgress());
  }, []);

  useEffect(() => {
    if (!autoExecute || autoExecutedRef.current) return;
    if (ssrSafe && !isClient()) return;

    autoExecutedRef.current = true;
    const timer = setTimeout(() => {
      execute().catch((error: unknown) => {
        if (debug) console.error("[OrchestRate] autoExecute failed", error);
      });
    }, autoExecuteDelay);

    return () => clearTimeout(timer);
  }, [autoExecute, autoExecuteDelay, debug, execute, ssrSafe]);

  const value: OrchestRateContextValue = {
    orchestrate,
    execute,
    cancel,
    abort,
    isPerforming,
    progress,
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

export function useOrchestRateProgress(): OrchestRateProgress {
  return useOrchestRate().progress;
}

export function useOrchestRateStep(
  id: string,
  effect: EffectFunction,
  options: UseOrchestRateStepOptions = {},
) {
  const { orchestrate, execute, cancel } = useOrchestRate();
  const { autoExecute: stepAutoExecute = false, trigger, waitFor, ...rest } = options;

  const effectRef = useRef(effect);
  effectRef.current = effect;
  const optionsRef = useRef(rest);
  optionsRef.current = rest;
  const triggerRef = useRef(trigger ?? "mount");
  triggerRef.current = trigger ?? "mount";
  const waitForRef = useRef(waitFor);
  waitForRef.current = waitFor;

  useEffect(() => {
    const register = () => {
      orchestrate(id, (ctx) => effectRef.current(ctx), {
        ...optionsRef.current,
        trigger: triggerRef.current,
        waitFor: waitForRef.current,
      });
      if (stepAutoExecute) execute().catch(console.error);
    };

    if (triggerRef.current === "viewport" && isClient()) {
      const selector =
        typeof waitForRef.current === "string" ? waitForRef.current : `#${id}`;
      const el = document.querySelector(selector);
      if (!el) {
        register();
        return () => cancel(id);
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            register();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(el);
      return () => {
        observer.disconnect();
        cancel(id);
      };
    }

    register();
    return () => cancel(id);
  }, [id, orchestrate, execute, cancel, stepAutoExecute]);
}
