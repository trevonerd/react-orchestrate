import type { OrchestrationItem } from "../types";

/** Pick next runnable wave for DAG (`after`) scheduling */
export function getNextWave(
  pending: Map<string, OrchestrationItem>,
  finished: Set<string>,
): OrchestrationItem[] {
  const wave: OrchestrationItem[] = [];
  for (const item of pending.values()) {
    if (item.after.every((dep) => finished.has(dep))) {
      wave.push(item);
    }
  }
  return wave;
}

export function usesDependencyGraph(items: OrchestrationItem[]): boolean {
  return items.some((item) => item.after.length > 0);
}

export function usesMultiplePhases(items: OrchestrationItem[]): boolean {
  const phases = new Set(items.map((i) => i.phase));
  return phases.size > 1;
}

/** Phase groups sorted ascending — each group runs in parallel */
export function getPhaseWaves(items: OrchestrationItem[]): OrchestrationItem[][] {
  const phases = [...new Set(items.map((i) => i.phase))].sort((a, b) => a - b);
  return phases.map((phase) => items.filter((i) => i.phase === phase));
}

/** Legacy sequential order by priority desc */
export function getPriorityWaves(items: OrchestrationItem[]): OrchestrationItem[][] {
  return [...items]
    .sort((a, b) => b.priority - a.priority)
    .map((item) => [item]);
}

export function buildExecutionWaves(items: OrchestrationItem[]): OrchestrationItem[][] {
  if (items.length === 0) return [];
  if (usesDependencyGraph(items)) return []; // dynamic waves during run
  if (usesMultiplePhases(items)) return getPhaseWaves(items);
  return getPriorityWaves(items);
}

export function validateDependencies(items: OrchestrationItem[]): void {
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    for (const dep of item.after) {
      if (!ids.has(dep)) {
        throw new Error(`Step "${item.id}" depends on unknown step "${dep}"`);
      }
    }
  }
}

export function detectCycle(items: OrchestrationItem[]): boolean {
  const ids = new Set(items.map((i) => i.id));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const graph = new Map(items.map((i) => [i.id, i.after]));

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of graph.get(id) ?? []) {
      if (!ids.has(dep)) continue;
      if (dfs(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const id of ids) {
    if (dfs(id)) return true;
  }
  return false;
}
