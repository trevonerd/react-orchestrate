export interface ScrollToOptions {
  behavior?: ScrollBehavior;
  /** Wait until scroll settles (ms). Default: 600 for smooth, 0 for instant */
  settleMs?: number;
}

/**
 * Scroll the window and wait until the scroll animation settles.
 */
export function scrollTo(top: number, options: ScrollToOptions = {}): Promise<void> {
  const { behavior = "smooth", settleMs } = options;
  const wait = settleMs ?? (behavior === "smooth" ? 600 : 0);

  window.scrollTo({ top, behavior });

  if (wait <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, wait));
}

/**
 * Scroll an element into view and wait until settled.
 */
export function scrollIntoView(
  target: string | Element,
  options: ScrollIntoViewOptions & { settleMs?: number } = {},
): Promise<void> {
  const { settleMs = 600, ...scrollOptions } = options;
  const element = typeof target === "string" ? document.querySelector(target) : target;

  if (!element) {
    return Promise.reject(new Error(`Element not found: ${String(target)}`));
  }

  element.scrollIntoView({ behavior: "smooth", block: "center", ...scrollOptions });
  return new Promise((resolve) => setTimeout(resolve, settleMs));
}

/**
 * Fetch JSON with a simulated delay (useful for demos).
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
