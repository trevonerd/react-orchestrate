import type { ReactNode } from "react";

export type EffectResult = unknown;

export const SKIP_MARKER = "__orchestrate_skipped__" as const;

export interface StepSkipResult {
  [SKIP_MARKER]: true;
  reason: string;
}

export interface StepErrorResult {
  error: string;
}

export function isSkipped(result: EffectResult): result is StepSkipResult {
  return (
    typeof result === "object" &&
    result !== null &&
    SKIP_MARKER in result &&
    (result as StepSkipResult)[SKIP_MARKER] === true
  );
}

export function isStepError(result: EffectResult): result is StepErrorResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as StepErrorResult).error === "string"
  );
}

export interface EffectContext {
  readonly results: Readonly<Record<string, EffectResult>>;
  get<T = EffectResult>(id: string): T | undefined;
  readonly signal: AbortSignal;
}

export type EffectFunction = (
  context: EffectContext,
) => Promise<EffectResult> | EffectResult;

export interface OrchestrateOptions {
  /** Pipeline name (default: "default") */
  pipeline?: string;
  /** Higher priority runs first when sequential (default: 0) */
  priority?: number;
  /**
   * Execution phase — steps in the same phase run in parallel.
   * Phases run in ascending order. Ignored when `after` is set on any step.
   */
  phase?: number;
  /** Run only after these step ids have completed */
  after?: string[];
  preDelay?: number;
  postDelay?: number;
  timeout?: number;
  /** Skip step when returns false */
  when?: () => boolean | Promise<boolean>;
  /** Reason recorded when skipped via `when` */
  skipReason?: string;
  /** Retry attempts on failure (default: 0) */
  retry?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Run only once per session (in-memory) */
  once?: boolean;
  /** Persist completion to localStorage (key or true for auto key) */
  persist?: boolean | string;
  /** CSS selector or resolver — waits for element before running */
  waitFor?: string | (() => Element | null);
  /** Start step when element enters viewport (requires waitFor or id as selector) */
  trigger?: "mount" | "viewport";
}

export interface OrchestrationItem {
  id: string;
  pipeline: string;
  effect: EffectFunction;
  priority: number;
  phase: number;
  after: string[];
  preDelay: number;
  postDelay: number;
  timeout?: number;
  when?: () => boolean | Promise<boolean>;
  skipReason?: string;
  retry: number;
  retryDelay: number;
  once: boolean;
  persist?: boolean | string;
  waitFor?: string | (() => Element | null);
  trigger: "mount" | "viewport";
}

export type OrchestrationResults = Record<string, EffectResult>;

export interface OrchestRateProgress {
  isPerforming: boolean;
  currentStep: string | null;
  completed: string[];
  skipped: string[];
  errored: string[];
  total: number;
  percent: number;
}

export interface OrchestRateCallbacks {
  onStepStart?: (id: string) => void;
  onStepComplete?: (id: string, result: EffectResult) => void;
  onStepSkip?: (id: string, reason: string) => void;
  onStepError?: (id: string, error: string) => void;
  onComplete?: (results: OrchestrationResults) => void;
  onProgress?: (progress: OrchestRateProgress) => void;
}

export interface CreateOrchestratorOptions extends OrchestRateCallbacks {
  debug?: boolean;
}

export interface OrchestRateContextValue {
  orchestrate: (
    id: string,
    effect: EffectFunction,
    options?: OrchestrateOptions,
  ) => void;
  execute: (pipeline?: string) => Promise<OrchestrationResults>;
  cancel: (id: string, pipeline?: string) => void;
  abort: () => void;
  isPerforming: boolean;
  progress: OrchestRateProgress;
}

export interface OrchestRateProviderProps extends OrchestRateCallbacks {
  children: ReactNode;
  /** Default pipeline name for child hooks */
  pipeline?: string;
  debug?: boolean;
  autoExecute?: boolean;
  autoExecuteDelay?: number;
  /** Skip autoExecute on server (default: true) */
  ssrSafe?: boolean;
}

export interface UseOrchestRateStepOptions extends OrchestrateOptions {
  autoExecute?: boolean;
}

export type PipelineDefinition = Record<string, EffectFunction>;

export type InferPipelineResults<T extends PipelineDefinition> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export type TypedEffectContext<T extends PipelineDefinition> = {
  readonly results: Readonly<Partial<InferPipelineResults<T>>>;
  get<K extends keyof T & string>(id: K): InferPipelineResults<T>[K] | undefined;
  readonly signal: AbortSignal;
};
