import { describe, expect, it } from "vitest";
import { createOrchestrator } from "./createOrchestrator";
import { definePipeline, registerPipeline } from "./definePipeline";

describe("definePipeline", () => {
  it("registers and runs typed pipeline steps", async () => {
    const tour = definePipeline({
      fetch: async () => ({ name: "Marco" }),
      greet: async ({ get }) => `Ciao ${get("fetch")?.name}`,
    });

    const orchestrator = createOrchestrator();
    registerPipeline(orchestrator.orchestrate.bind(orchestrator), tour);

    const results = await orchestrator.execute();
    expect(results.greet).toBe("Ciao Marco");
  });
});
