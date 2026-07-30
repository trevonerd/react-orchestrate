import type { ReactNode } from "react";

export type EffectResult = unknown;

export interface EffectContext {
  /** Results from steps already executed in this run */
  readonly results: Readonly<Record<string, EffectResult>>;
  /** Get a previous step result by id */
  get<T = EffectResult>(id: string): T | undefined;
}

export type EffectFunction = (
  context: EffectContext,
) => Promise<EffectResult> | EffectResult;

export interface OrchestrateOptions {
  /** Higher priority runs first (default: 0) */
  priority?: number;
  /** Milliseconds to wait before running the effect */
  preDelay?: number;
  /** Milliseconds to wait after the effect completes */
  postDelay?: number;
  /** Max milliseconds before the effect is rejected with a timeout error */
  timeout?: number;
}

export interface OrchestrationItem {
  id: string;
  effect: EffectFunction;
  priority: number;
  preDelay: number;
  postDelay: number;
  timeout?: number;
}

export type OrchestrationResults = Record<string, EffectResult>;

export interface OrchestRateContextValue {
  orchestrate: (
    id: string,
    effect: EffectFunction,
    options?: OrchestrateOptions,
  ) => void;
  execute: () => Promise<OrchestrationResults>;
  cancel: (id: string) => void;
  isPerforming: boolean;
}

export interface OrchestRateProviderProps {
  children: ReactNode;
  /** Log orchestration steps to the console */
  debug?: boolean;
  /** Run all registered steps automatically once after mount */
  autoExecute?: boolean;
  /** Delay before autoExecute runs (ms) */
  autoExecuteDelay?: number;
}

export interface UseOrchestRateStepOptions extends OrchestrateOptions {
  /** When false, only registers the step without triggering execute */
  autoExecute?: boolean;
}
