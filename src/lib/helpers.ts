import { isClient } from "./internal/storage";
import { waitForElement } from "./internal/wait";

export { waitForElement };

export interface ScrollToOptions {
  behavior?: ScrollBehavior;
  settleMs?: number;
}

export function scrollTo(top: number, options: ScrollToOptions = {}): Promise<void> {
  if (!isClient()) return Promise.resolve();
  const { behavior = "smooth", settleMs } = options;
  const wait = settleMs ?? (behavior === "smooth" ? 600 : 0);
  window.scrollTo({ top, behavior });
  if (wait <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, wait));
}

export function scrollIntoView(
  target: string | Element,
  options: ScrollIntoViewOptions & { settleMs?: number } = {},
): Promise<void> {
  if (!isClient()) return Promise.resolve();
  const { settleMs = 600, ...scrollOptions } = options;
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) {
    return Promise.reject(new Error(`Element not found: ${String(target)}`));
  }
  element.scrollIntoView({ behavior: "smooth", block: "center", ...scrollOptions });
  return new Promise((resolve) => setTimeout(resolve, settleMs));
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function withViewTransition<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!isClient() || !document.startViewTransition) {
    return fn();
  }
  return new Promise<T>((resolve, reject) => {
    document.startViewTransition(async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    });
  });
}
