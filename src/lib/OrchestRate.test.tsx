import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrchestRateProvider, useOrchestRate, useOrchestRateStep } from "./OrchestRate";

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

  it("exposes isPerforming during execution", async () => {
    function Runner() {
      const { orchestrate, execute, isPerforming } = useOrchestRate();

      return (
        <div>
          <span data-testid="status">{isPerforming ? "running" : "idle"}</span>
          <button
            type="button"
            onClick={() => {
              orchestrate("slow", async () => {
                await new Promise((resolve) => setTimeout(resolve, 200));
              });
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
        <Runner />
      </OrchestRateProvider>,
    );

    expect(screen.getByTestId("status").textContent).toBe("idle");

    await act(async () => {
      screen.getByRole("button", { name: "run" }).click();
    });

    expect(screen.getByTestId("status").textContent).toBe("running");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
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
