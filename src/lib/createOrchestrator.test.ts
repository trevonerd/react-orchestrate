import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "./createOrchestrator";

describe("createOrchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs effects in descending priority order", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate(
      "low",
      () => {
        order.push("low");
      },
      { priority: 1 },
    );
    orchestrator.orchestrate(
      "high",
      () => {
        order.push("high");
      },
      { priority: 10 },
    );
    orchestrator.orchestrate(
      "mid",
      () => {
        order.push("mid");
      },
      { priority: 5 },
    );

    const results = await orchestrator.execute();
    expect(order).toEqual(["high", "mid", "low"]);
    expect(results).toEqual({ high: undefined, mid: undefined, low: undefined });
  });

  it("passes previous results via context.get()", async () => {
    const orchestrator = createOrchestrator();

    orchestrator.orchestrate("fetch", () => ({ title: "Hello" }), { priority: 10 });
    orchestrator.orchestrate(
      "message",
      ({ get }) => {
        const data = get<{ title: string }>("fetch");
        return `Got: ${data?.title}`;
      },
      { priority: 5 },
    );

    const results = await orchestrator.execute();
    expect(results.message).toBe("Got: Hello");
  });

  it("applies pre and post delays", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate(
      "delayed",
      () => {
        order.push("run");
      },
      { preDelay: 100, postDelay: 50 },
    );

    const promise = orchestrator.execute();
    await vi.advanceTimersByTimeAsync(100);
    expect(order).toEqual(["run"]);
    await vi.advanceTimersByTimeAsync(50);
    await promise;
  });

  it("rejects effects that exceed timeout", async () => {
    const orchestrator = createOrchestrator();

    orchestrator.orchestrate(
      "slow",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return "done";
      },
      { timeout: 100 },
    );

    const promise = orchestrator.execute();
    await vi.advanceTimersByTimeAsync(100);
    const results = await promise;
    expect(results.slow).toEqual({ error: "Effect timed out after 100ms" });
  });

  it("cancels a registered effect before execute", async () => {
    const orchestrator = createOrchestrator();
    const ran: string[] = [];

    orchestrator.orchestrate("a", () => {
      ran.push("a");
    });
    orchestrator.orchestrate("b", () => {
      ran.push("b");
    });
    orchestrator.cancel("a");

    await orchestrator.execute();
    expect(ran).toEqual(["b"]);
  });

  it("allows replay after execute", async () => {
    const orchestrator = createOrchestrator();
    let count = 0;

    orchestrator.orchestrate("step", () => {
      count += 1;
    });

    await orchestrator.execute();
    await orchestrator.execute();
    expect(count).toBe(2);
  });

  it("isolates errors without stopping the queue", async () => {
    const orchestrator = createOrchestrator();
    const order: string[] = [];

    orchestrator.orchestrate(
      "fail",
      () => {
        throw new Error("boom");
      },
      { priority: 10 },
    );
    orchestrator.orchestrate(
      "ok",
      () => {
        order.push("ok");
      },
      { priority: 5 },
    );

    const results = await orchestrator.execute();
    expect(results.fail).toEqual({ error: "boom" });
    expect(order).toEqual(["ok"]);
  });
});
