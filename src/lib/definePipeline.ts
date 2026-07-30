import type {
  EffectFunction,
  OrchestrateOptions,
  PipelineDefinition,
  TypedEffectContext,
} from "./types";

/**
 * Define a typed pipeline for better `get()` inference in step effects.
 *
 * @example
 * const tour = definePipeline({
 *   'fetch': async () => ({ name: 'Marco' }),
 *   'greet': async ({ get }) => `Ciao ${get('fetch')?.name}`,
 * });
 */
export function definePipeline<T extends PipelineDefinition>(definition: T): T {
  return definition;
}

/** Create a typed effect wrapper for a pipeline step */
export function pipelineStep<T extends PipelineDefinition, K extends keyof T & string>(
  _pipeline: T,
  _id: K,
  effect: (
    ctx: TypedEffectContext<T>,
  ) => ReturnType<T[K]> extends EffectFunction ? ReturnType<T[K]> : never,
): EffectFunction {
  return effect as EffectFunction;
}

/** Register all steps from a definePipeline object */
export function registerPipeline(
  orchestrate: (id: string, effect: EffectFunction, options?: OrchestrateOptions) => void,
  definition: PipelineDefinition,
  options?: { pipeline?: string; priorityStart?: number },
): void {
  const { pipeline, priorityStart = 100 } = options ?? {};
  const entries = Object.entries(definition);
  entries.forEach(([id, effect], index) => {
    orchestrate(id, effect, {
      pipeline,
      priority: priorityStart - index,
    });
  });
}
