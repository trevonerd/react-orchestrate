import { isClient, sleep } from "./storage";

export async function waitForElement(
  target: string | (() => Element | null),
  signal: AbortSignal,
  timeout = 10_000,
): Promise<Element> {
  if (!isClient()) {
    throw new Error("waitForElement is only available in the browser");
  }

  const resolveElement = (): Element | null => {
    if (typeof target === "string") return document.querySelector(target);
    return target();
  };

  const existing = resolveElement();
  if (existing) return existing;

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const el = resolveElement();
      if (el) {
        cleanup();
        resolve(el);
      }
    });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`waitForElement timed out: ${String(target)}`));
    }, timeout);

    const onAbort = () => {
      cleanup();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      observer.disconnect();
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    signal.addEventListener("abort", onAbort);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export function waitForViewport(
  target: string | Element,
  signal: AbortSignal,
): Promise<void> {
  if (!isClient()) return Promise.resolve();

  const element =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!element) {
    return Promise.reject(new Error(`Element not found: ${String(target)}`));
  }

  return new Promise((resolve, reject) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          resolve();
        }
      },
      { threshold: 0.1 },
    );

    const onAbort = () => {
      observer.disconnect();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort);
    observer.observe(element);
  });
}

export { sleep };
