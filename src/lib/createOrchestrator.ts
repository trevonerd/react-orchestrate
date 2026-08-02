import { runStepItem } from "./internal/runStep";
import {
  buildExecutionWaves,
  detectCycle,
  getNextWave,
  usesDependencyGraph,
  validateDependencies,
} from "./internal/schedule";
import { hasPersisted, markPersisted, persistKey } from "./internal/storage";
import { waitForViewport } from "./internal/wait";
import type {
  CreateOrchestratorOptions,
  EffectFunction,
  EffectResult,
  OrchestrateOptions,
  OrchestrationItem,
  OrchestrationResults,
  OrchestRateProgress,
  StepSkipResult,
} from "./types";
import { SKIP_MARKER } from "./types";

const DEFAULT_PIPELINE = "default";

const emptyProgress = (): OrchestRateProgress => ({
  isPerforming: false,
  currentStep: null,
  completed: [],
  skipped: [],
  errored: [],
  total: 0,
  percent: 0,
});

const normalizeOptions = (
  options: OrchestrateOptions = {},
  defaultPipeline: string,
): OrchestrationItem => {
  const id = ""; // filled by caller
  return {
    id,
    pipeline: options.pipeline ?? defaultPipeline,
    effect: (() => undefined) as EffectFunction,
    priority: options.priority ?? 0,
    phase: options.phase ?? 0,
    after: options.after ?? [],
    preDelay: options.preDelay ?? 0,
    postDelay: options.postDelay ?? 0,
    timeout: options.timeout,
    when: options.when,
    skipReason: options.skipReason,
    retry: options.retry ?? 0,
    retryDelay: options.retryDelay ?? 0,
    once: options.once ?? false,
    persist: options.persist,
    waitFor: options.waitFor,
    trigger: options.trigger ?? "mount",
  };
};

export interface Orchestrator {
  orchestrate: (
    id: string,
    effect: EffectFunction,
    options?: OrchestrateOptions,
  ) => void;
  execute: (pipeline?: string) => Promise<OrchestrationResults>;
  cancel: (id: string, pipeline?: string) => void;
  abort: () => void;
  clearPersisted: (id: string, pipeline?: string) => void;
  readonly isPerforming: boolean;
  getProgress: () => OrchestRateProgress;
  dispose: () => void;
}

export const createOrchestrator = (
  options: CreateOrchestratorOptions = {},
): Orchestrator => {
  const { debug = false, ...callbacks } = options;
  const registry = new Map<string, Map<string, OrchestrationItem>>();
  const ranOnce = new Set<string>();
  let performing = false;
  let progress = emptyProgress();
  let pendingExecutions: Array<{
    pipeline: string;
    resolve: (value: OrchestrationResults) => void;
    reject: (reason: unknown) => void;
  }> = [];
  let abortController: AbortController | null = null;

  const log = (message: string) => {
    if (debug) console.log(`[OrchestRate] ${message}`);
  };

  const pipelineRegistry = (pipeline: string): Map<string, OrchestrationItem> => {
    let map = registry.get(pipeline);
    if (!map) {
      map = new Map();
      registry.set(pipeline, map);
    }
    return map;
  };

  const stepKey = (pipeline: string, id: string) => `${pipeline}::${id}`;

  const emitProgress = (patch: Partial<OrchestRateProgress>) => {
    progress = { ...progress, ...patch };
    const done =
      progress.completed.length + progress.skipped.length + progress.errored.length;
    progress.percent =
      progress.total > 0 ? Math.round((done / progress.total) * 100) : 0;
    callbacks.onProgress?.(progress);
  };

  const orchestrate = (
    id: string,
    effect: EffectFunction,
    opts: OrchestrateOptions = {},
  ) => {
    const base = normalizeOptions(opts, DEFAULT_PIPELINE);
    const item: OrchestrationItem = { ...base, id, effect };
    pipelineRegistry(item.pipeline).set(id, item);
    log(`registered "${id}" [${item.pipeline}] phase=${item.phase} after=[${item.after.join(",")}]`);
  };

  const cancel = (id: string, pipeline = DEFAULT_PIPELINE) => {
    if (pipelineRegistry(pipeline).delete(id)) {
      log(`cancelled "${id}"`);
    }
  };

  const clearPersistedStep = (id: string, pipeline = DEFAULT_PIPELINE) => {
    const item = pipelineRegistry(pipeline).get(id);
    if (!item?.persist) return;
    const key = persistKey(pipeline, id, item.persist);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  const shouldSkip = async (item: OrchestrationItem): Promise<StepSkipResult | null> => {
    const key = stepKey(item.pipeline, item.id);

    if (item.once && ranOnce.has(key)) {
      return { [SKIP_MARKER]: true, reason: "once (session)" };
    }

    if (item.persist) {
      const pKey = persistKey(item.pipeline, item.id, item.persist);
      if (hasPersisted(pKey)) {
        return { [SKIP_MARKER]: true, reason: "persisted" };
      }
    }

    if (item.when) {
      const ok = await item.when();
      if (!ok) {
        return {
          [SKIP_MARKER]: true,
          reason: item.skipReason ?? "when() returned false",
        };
      }
    }

    return null;
  };

  const runSingleItem = async (
    item: OrchestrationItem,
    results: OrchestrationResults,
    signal: AbortSignal,
  ): Promise<void> => {
    if (item.trigger === "viewport") {
      const target =
        typeof item.waitFor === "string"
          ? item.waitFor
          : item.waitFor
            ? item.waitFor()
            : document.querySelector(`#${item.id}`);
      if (target) {
        await waitForViewport(target, signal);
      }
    }

    const skip = await shouldSkip(item);
    if (skip) {
      results[item.id] = skip;
      callbacks.onStepSkip?.(item.id, skip.reason);
      emitProgress({
        currentStep: null,
        skipped: [...progress.skipped, item.id],
      });
      log(`skipped "${item.id}": ${skip.reason}`);
      return;
    }

    callbacks.onStepStart?.(item.id);
    emitProgress({ currentStep: item.id });

    const context = {
      results,
      get: <T>(stepId: string) => results[stepId] as T | undefined,
      signal,
    };

    try {
      const result = await runStepItem(item, context, signal);
      results[item.id] = result as EffectResult;

      const key = stepKey(item.pipeline, item.id);
      if (item.once) ranOnce.add(key);
      if (item.persist) {
        markPersisted(persistKey(item.pipeline, item.id, item.persist));
      }

      callbacks.onStepComplete?.(item.id, result as EffectResult);
      emitProgress({
        currentStep: null,
        completed: [...progress.completed, item.id],
      });
      log(`done "${item.id}"`);
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      results[item.id] = { error: message };
      callbacks.onStepError?.(item.id, message);
      emitProgress({
        currentStep: null,
        errored: [...progress.errored, item.id],
      });
      log(`error "${item.id}": ${message}`);
    }

    if (item.postDelay > 0 && !signal.aborted) {
      await new Promise((r) => setTimeout(r, item.postDelay));
    }
  };

  const runWave = async (
    wave: OrchestrationItem[],
    results: OrchestrationResults,
    signal: AbortSignal,
  ) => {
    await Promise.all(wave.map((item) => runSingleItem(item, results, signal)));
  };

  const runPipeline = async (pipeline: string): Promise<OrchestrationResults> => {
    const items = [...pipelineRegistry(pipeline).values()];
    if (items.length === 0) {
      log(`execute: empty pipeline "${pipeline}"`);
      return {};
    }

    validateDependencies(items);
    if (detectCycle(items)) {
      throw new Error(`Circular dependency detected in pipeline "${pipeline}"`);
    }

    performing = true;
    abortController = new AbortController();
    const signal = abortController.signal;
    const results: OrchestrationResults = {};

    progress = {
      isPerforming: true,
      currentStep: null,
      completed: [],
      skipped: [],
      errored: [],
      total: items.length,
      percent: 0,
    };
    emitProgress({});

    const dagMode = usesDependencyGraph(items);

    if (dagMode) {
      const pending = new Map(items.map((i) => [i.id, i]));
      const finished = new Set<string>();

      while (pending.size > 0 && !signal.aborted) {
        const wave = getNextWave(pending, finished);
        if (wave.length === 0) {
          throw new Error(`Unresolved dependencies in pipeline "${pipeline}"`);
        }
        for (const item of wave) pending.delete(item.id);
        await runWave(wave, results, signal);
        for (const item of wave) finished.add(item.id);
      }
    } else {
      const waves = buildExecutionWaves(items);
      for (const wave of waves) {
        if (signal.aborted) break;
        await runWave(wave, results, signal);
      }
    }

    performing = false;
    abortController = null;
    progress = { ...progress, isPerforming: false, currentStep: null, percent: 100 };
    emitProgress({});
    callbacks.onComplete?.(results);
    log(`pipeline "${pipeline}" complete`);

    return results;
  };

  const execute = async (pipeline = DEFAULT_PIPELINE): Promise<OrchestrationResults> => {
    if (performing) {
      log("queueing execute while run in progress");
      return new Promise<OrchestrationResults>((resolve, reject) => {
        pendingExecutions.push({ pipeline, resolve, reject });
      });
    }

    try {
      const results = await runPipeline(pipeline);

      if (pendingExecutions.length > 0) {
        const next = pendingExecutions.shift();
        if (next) {
          execute(next.pipeline).then(next.resolve).catch(next.reject);
        }
      }

      return results;
    } catch (error) {
      performing = false;
      abortController = null;
      progress = { ...progress, isPerforming: false };
      emitProgress({});
      throw error;
    }
  };

  const abort = () => {
    abortController?.abort();
    log("aborted");
  };

  const dispose = () => {
    abort();
    registry.clear();
    pendingExecutions = [];
    performing = false;
    ranOnce.clear();
    progress = emptyProgress();
  };

  return {
    orchestrate,
    execute,
    cancel,
    abort,
    clearPersisted: clearPersistedStep,
    dispose,
    getProgress: () => progress,
    get isPerforming() {
      return performing;
    },
  };
};
