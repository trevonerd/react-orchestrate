import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "./createOrchestrator";
import { SKIP_MARKER } from "./types";

describe("createOrchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs effects in descending priority order (legacy mode)", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate("low", () => order.push("low"), { priority: 1 });
    orchestrator.orchestrate("high", () => order.push("high"), { priority: 10 });
    orchestrator.orchestrate("mid", () => order.push("mid"), { priority: 5 });

    await orchestrator.execute();
    expect(order).toEqual(["high", "mid", "low"]);
  });

  it("runs steps with `after` in dependency order (parallel waves)", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate("a", () => order.push("a"));
    orchestrator.orchestrate("b", () => order.push("b"));
    orchestrator.orchestrate("c", () => order.push("c"), { after: ["a", "b"] });

    await orchestrator.execute();
    expect(order.indexOf("c")).toBeGreaterThan(order.indexOf("a"));
    expect(order.indexOf("c")).toBeGreaterThan(order.indexOf("b"));
  });

  it("runs same-phase steps in parallel", async () => {
    const orchestrator = createOrchestrator();
    let running = 0;
    let maxConcurrent = 0;

    orchestrator.orchestrate(
      "a",
      async () => {
        running++;
        maxConcurrent = Math.max(maxConcurrent, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
      },
      { phase: 1 },
    );
    orchestrator.orchestrate(
      "b",
      async () => {
        running++;
        maxConcurrent = Math.max(maxConcurrent, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
      },
      { phase: 1 },
    );
    orchestrator.orchestrate("c", () => undefined, { phase: 2 });

    const promise = orchestrator.execute();
    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(maxConcurrent).toBe(2);
  });

  it("passes results via context.get()", async () => {
    const orchestrator = createOrchestrator();
    orchestrator.orchestrate("fetch", () => ({ title: "Hello" }), { priority: 10 });
    orchestrator.orchestrate(
      "message",
      ({ get }) => `Got: ${get<{ title: string }>("fetch")?.title}`,
      { after: ["fetch"] },
    );

    const results = await orchestrator.execute();
    expect(results.message).toBe("Got: Hello");
  });

  it("skips when when() returns false", async () => {
    const orchestrator = createOrchestrator();
    const ran: string[] = [];

    orchestrator.orchestrate("skip-me", () => ran.push("nope"), {
      when: () => false,
      skipReason: "disabled",
    });
    orchestrator.orchestrate("run-me", () => ran.push("yes"));

    const results = await orchestrator.execute();
    expect(ran).toEqual(["yes"]);
    expect(results["skip-me"]).toEqual({
      [SKIP_MARKER]: true,
      reason: "disabled",
    });
  });

  it("retries failed steps", async () => {
    const orchestrator = createOrchestrator();
    let attempts = 0;

    orchestrator.orchestrate(
      "flaky",
      () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
        return "ok";
      },
      { retry: 2, retryDelay: 10 },
    );

    const promise = orchestrator.execute();
    await vi.advanceTimersByTimeAsync(30);
    const results = await promise;

    expect(attempts).toBe(3);
    expect(results.flaky).toBe("ok");
  });

  it("aborts running pipeline", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate("slow", async () => {
      await new Promise((r) => setTimeout(r, 500));
      order.push("slow");
    });
    orchestrator.orchestrate("never", () => order.push("never"), { priority: 0 });

    const promise = orchestrator.execute();
    await vi.advanceTimersByTimeAsync(10);
    orchestrator.abort();
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(order).not.toContain("never");
  });

  it("fires lifecycle callbacks", async () => {
    const onStepStart = vi.fn();
    const onStepComplete = vi.fn();
    const onComplete = vi.fn();

    const orchestrator = createOrchestrator({ onStepStart, onStepComplete, onComplete });
    orchestrator.orchestrate("a", () => "done");

    await orchestrator.execute();
    expect(onStepStart).toHaveBeenCalledWith("a");
    expect(onStepComplete).toHaveBeenCalledWith("a", "done");
    expect(onComplete).toHaveBeenCalled();
  });

  it("tracks progress", async () => {
    const orchestrator = createOrchestrator();
    orchestrator.orchestrate("a", () => 1);
    orchestrator.orchestrate("b", () => 2, { after: ["a"] });

    await orchestrator.execute();
    const progress = orchestrator.getProgress();
    expect(progress.completed).toContain("a");
    expect(progress.completed).toContain("b");
    expect(progress.percent).toBe(100);
  });

  it("persists once completion", async () => {
    const orchestrator = createOrchestrator();
    let count = 0;
    orchestrator.orchestrate("once", () => {
      count++;
    }, { persist: "test-once" });

    await orchestrator.execute();
    await orchestrator.execute();
    expect(count).toBe(1);
  });

  it("rejects circular dependencies", async () => {
    const orchestrator = createOrchestrator();
    orchestrator.orchestrate("a", () => undefined, { after: ["b"] });
    orchestrator.orchestrate("b", () => undefined, { after: ["a"] });

    await expect(orchestrator.execute()).rejects.toThrow(/Circular/);
  });
});
