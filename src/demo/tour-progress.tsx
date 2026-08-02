import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { EffectFunction, UseOrchestRateStepOptions } from "../lib";
import { useOrchestRateStep } from "../lib";

export type StepStatus = "pending" | "running" | "done" | "error";

export interface TourStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface TourProgressContextValue {
  steps: TourStep[];
  registerStep: (id: string, label: string) => void;
  setStatus: (id: string, status: StepStatus) => void;
  resetSteps: () => void;
}

const TourProgressContext = createContext<TourProgressContextValue | null>(null);

export function TourProgressProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[]>([]);

  const registerStep = useCallback((id: string, label: string) => {
    setSteps((prev) => {
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, label, status: "pending" }];
    });
  }, []);

  const setStatus = useCallback((id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  const resetSteps = useCallback(() => {
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending" as StepStatus })));
  }, []);

  const value = useMemo(
    () => ({ steps, registerStep, setStatus, resetSteps }),
    [steps, registerStep, setStatus, resetSteps],
  );

  return (
    <TourProgressContext.Provider value={value}>
      {children}
    </TourProgressContext.Provider>
  );
}

export function useTourProgress() {
  const ctx = useContext(TourProgressContext);
  if (!ctx) throw new Error("useTourProgress requires TourProgressProvider");
  return ctx;
}

/** Demo helper: registers a labelled step + updates the timeline UI */
export function useTourStep(
  id: string,
  label: string,
  effect: EffectFunction,
  options?: UseOrchestRateStepOptions,
) {
  const { registerStep, setStatus } = useTourProgress();

  useEffect(() => {
    registerStep(id, label);
  }, [id, label, registerStep]);

  useOrchestRateStep(
    id,
    async (ctx) => {
      setStatus(id, "running");
      try {
        const result = await effect(ctx);
        setStatus(id, "done");
        return result;
      } catch {
        setStatus(id, "error");
        throw new Error(`Step "${id}" failed`);
      }
    },
    options,
  );
}
