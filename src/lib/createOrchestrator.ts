import type {
  EffectContext,
  EffectFunction,
  OrchestrateOptions,
  OrchestrationItem,
  OrchestrationResults,
} from "./types";

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

const runWithTimeout = async (
  effect: EffectFunction,
  context: EffectContext,
  timeout: number | undefined,
  signal: AbortSignal,
): Promise<unknown> => {
  if (!timeout) {
    return effect(context);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Effect timed out after ${timeout}ms`)),
      timeout,
    );
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  });

  try {
    return await Promise.race([Promise.resolve(effect(context)), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export interface Orchestrator {
  orchestrate: (
    id: string,
    effect: EffectFunction,
    options?: OrchestrateOptions,
  ) => void;
  execute: () => Promise<OrchestrationResults>;
  cancel: (id: string) => void;
  readonly isPerforming: boolean;
  dispose: () => void;
}

export const createOrchestrator = (debug = false): Orchestrator => {
  /** Registered steps persist across execute() calls for replay */
  const registry = new Map<string, OrchestrationItem>();
  let performing = false;
  let pendingExecutions: Array<{
    resolve: (value: OrchestrationResults) => void;
    reject: (reason: unknown) => void;
  }> = [];
  let abortController: AbortController | null = null;

  const log = (message: string) => {
    if (debug) console.log(`[OrchestRate] ${message}`);
  };

  const orchestrate = (
    id: string,
    effect: EffectFunction,
    options: OrchestrateOptions = {},
  ) => {
    const { priority = 0, preDelay = 0, postDelay = 0, timeout } = options;

    registry.set(id, {
      id,
      effect,
      priority,
      preDelay,
      postDelay,
      timeout,
    });

    log(`registered "${id}" (priority ${priority})`);
  };

  const cancel = (id: string) => {
    if (registry.delete(id)) {
      log(`cancelled "${id}"`);
    }
  };

  const runQueue = async (): Promise<OrchestrationResults> => {
    if (registry.size === 0) {
      log("execute called with empty queue");
      return {};
    }

    performing = true;
    abortController = new AbortController();
    const signal = abortController.signal;
    const results: OrchestrationResults = {};

    const contextFor = (): EffectContext => ({
      results,
      get: <T>(id: string) => results[id] as T | undefined,
    });

    const sorted = [...registry.values()].sort((a, b) => b.priority - a.priority);
    log(
      `executing: ${sorted.map((item) => `${item.id}(${item.priority})`).join(" → ")}`,
    );

    for (const item of sorted) {
      if (signal.aborted) break;

      log(`start "${item.id}"`);
      const startedAt = performance.now();

      if (item.preDelay > 0) {
        await sleep(item.preDelay, signal);
      }

      try {
        results[item.id] = await runWithTimeout(
          item.effect,
          contextFor(),
          item.timeout,
          signal,
        );
        log(`done "${item.id}" in ${(performance.now() - startedAt).toFixed(0)}ms`);
      } catch (error) {
        if (signal.aborted) break;
        const message = error instanceof Error ? error.message : String(error);
        results[item.id] = { error: message };
        log(`error "${item.id}": ${message}`);
      }

      if (item.postDelay > 0 && !signal.aborted) {
        await sleep(item.postDelay, signal);
      }
    }

    performing = false;
    abortController = null;
    log("orchestration complete");

    return results;
  };

  const execute = async (): Promise<OrchestrationResults> => {
    if (performing) {
      log("queueing execute while run in progress");
      return new Promise<OrchestrationResults>((resolve, reject) => {
        pendingExecutions.push({ resolve, reject });
      });
    }

    try {
      const results = await runQueue();

      if (pendingExecutions.length > 0) {
        const next = pendingExecutions.shift();
        if (next) {
          execute().then(next.resolve).catch(next.reject);
        }
      }

      return results;
    } catch (error) {
      performing = false;
      abortController = null;
      throw error;
    }
  };

  const dispose = () => {
    abortController?.abort();
    registry.clear();
    pendingExecutions = [];
    performing = false;
  };

  return {
    orchestrate,
    execute,
    cancel,
    dispose,
    get isPerforming() {
      return performing;
    },
  };
};
