import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OrchestRateProvider,
  useOrchestRate,
  useOrchestRateProgress,
  useOrchestRateStep,
} from "./OrchestRate";

describe("OrchestRate React integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes registered steps via useOrchestRateStep", async () => {
    const effect = vi.fn(() => "ok");

    function TestStep() {
      useOrchestRateStep("test", effect, { priority: 1, autoExecute: true });
      return null;
    }

    render(
      <OrchestRateProvider>
        <TestStep />
      </OrchestRateProvider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(effect).toHaveBeenCalled();
  });

  it("exposes progress via useOrchestRateProgress", async () => {
    function ProgressReader() {
      const { orchestrate, execute } = useOrchestRate();
      const progress = useOrchestRateProgress();

      return (
        <div>
          <span data-testid="percent">{progress.percent}</span>
          <button
            type="button"
            onClick={() => {
              orchestrate("a", () => 1);
              execute();
            }}
          >
            run
          </button>
        </div>
      );
    }

    render(
      <OrchestRateProvider>
        <ProgressReader />
      </OrchestRateProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: "run" }).click();
    });

    expect(screen.getByTestId("percent").textContent).toBe("100");
  });

  it("supports abort()", async () => {
    function Runner() {
      const { orchestrate, execute, abort, isPerforming } = useOrchestRate();

      return (
        <div>
          <span data-testid="status">{isPerforming ? "running" : "idle"}</span>
          <button
            type="button"
            onClick={() => {
              orchestrate("slow", async () => {
                await new Promise((r) => setTimeout(r, 500));
              });
              execute();
            }}
          >
            run
          </button>
          <button type="button" onClick={() => abort()}>
            abort
          </button>
        </div>
      );
    }

    render(
      <OrchestRateProvider>
        <Runner />
      </OrchestRateProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: "run" }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "abort" }).click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("autoExecute on provider runs after delay", async () => {
    const effect = vi.fn();

    function Step() {
      useOrchestRateStep("auto", effect);
      return null;
    }

    render(
      <OrchestRateProvider autoExecute autoExecuteDelay={100}>
        <Step />
      </OrchestRateProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(effect).toHaveBeenCalled();
  });

  it("throws when useOrchestRate is used outside provider", () => {
    function Bad() {
      useOrchestRate();
      return null;
    }

    expect(() => render(<Bad />)).toThrow(
      "useOrchestRate must be used within OrchestRateProvider",
    );
  });
});
