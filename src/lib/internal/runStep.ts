import type { EffectContext, EffectFunction, OrchestrationItem } from "../types";
import { sleep } from "./storage";
import { waitForElement } from "./wait";

export async function runEffectWithTimeout(
  effect: EffectFunction,
  context: EffectContext,
  timeout: number | undefined,
  signal: AbortSignal,
): Promise<unknown> {
  if (!timeout) return effect(context);

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
}

export async function runStepItem(
  item: OrchestrationItem,
  context: EffectContext,
  signal: AbortSignal,
): Promise<unknown> {
  if (item.preDelay > 0) await sleep(item.preDelay, signal);

  if (item.waitFor) {
    await waitForElement(item.waitFor, signal);
  }

  let lastError: unknown;
  const attempts = item.retry + 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    try {
      return await runEffectWithTimeout(item.effect, context, item.timeout, signal);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && item.retryDelay > 0) {
        await sleep(item.retryDelay, signal);
      }
    }
  }

  throw lastError;
}
