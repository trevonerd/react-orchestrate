export const isClient = (): boolean => typeof window !== "undefined";

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
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

export function persistKey(pipeline: string, id: string, custom?: boolean | string): string {
  if (typeof custom === "string") return custom;
  return `orchestrate:${pipeline}:${id}`;
}

export function hasPersisted(key: string): boolean {
  if (!isClient()) return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markPersisted(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearPersisted(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
