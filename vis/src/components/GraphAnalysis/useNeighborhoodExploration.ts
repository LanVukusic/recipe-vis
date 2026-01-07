import { useState, useCallback, useMemo, useEffect } from "react";
import {
  type Recipe,
  type GraphNode,
  type GraphEdge,
  constructRecipeGraph,
  randomWalkWithRestarts,
  sampleConnectedSubgraph,
  type CustomGraph,
} from "./graphHelpers";
import type { FreqMap } from "../../App";

export interface ExplorationState {
  graph: CustomGraph | null;
  finalSubgraph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  isExploring: boolean;
  error: string | null;
}

export const useNeighborhoodExploration = (
  ingredientFrequencies: FreqMap,
  recipes: Recipe[]
) => {
  const [explorationState, setExplorationState] = useState<ExplorationState>({
    graph: null,
    finalSubgraph: null,
    isExploring: false,
    error: null,
  });

  // Memoize ingredientFrequencies to prevent unnecessary rebuilds
  const memoizedFrequencies = useMemo(
    () => ingredientFrequencies,
    [ingredientFrequencies]
  );

  // Build the graph from recipes
  const buildGraph = useCallback(
    (recipes: Recipe[]) => {
      try {
        console.log("BG", { ingredientFrequencies: memoizedFrequencies });

        const graph = constructRecipeGraph(recipes, memoizedFrequencies);
        console.log("created graph: ", graph);

        setExplorationState((prev) => ({
          ...prev,
          graph,
          error: null,
        }));
        return graph;
      } catch (error) {
        console.log({ error });

        setExplorationState((prev) => ({
          ...prev,
          error: "Failed to build graph: " + (error as Error).message,
        }));
        return null;
      }
    },
    [memoizedFrequencies]
  );

  useEffect(() => {
    if (recipes.length == 0) {
      return;
    }

    setExplorationState({
      ...explorationState,
      graph: buildGraph(recipes),
    });
  }, [recipes]);

  // Start exploration from a specific recipe
  const startExploration = useCallback(
    async (
      recipes: Recipe[],
      startingRecipes: Recipe[],
      restartProbability: number,
      maxSteps: number,
      minVisits: number,
      useFilteredGraph: boolean
    ) => {
      if (explorationState.graph == null) {
        console.log("no graph. exiting");
        return;
      }

      if (useFilteredGraph) {
        console.log("using only filtered recipes");
      }

      console.log(`starting with ${recipes.length} recipes`);

      setExplorationState((prev) => ({
        ...prev,
        isExploring: true,
      }));

      try {
        console.log("trying ranom walk");

        // Perform the complete random walk
        const walkResult = randomWalkWithRestarts(
          structuredClone(explorationState.graph),
          // JSON.parse(JSON.stringify(explorationState.graph)),
          startingRecipes.map((recipe) => recipe.index.toString()),
          restartProbability,
          maxSteps,
          useFilteredGraph
        );

        console.log({ walkResult });

        // Get the final subgraph
        const finalSubgraph = sampleConnectedSubgraph(walkResult, minVisits);

        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          finalSubgraph,
          // visitCounts: walkResult.nodes.reduce((map, node) => {
          //   map.set(node.id, node.visitedCount);
          //   return map;
          // }, new Map<string, number>()),
        }));
      } catch (error) {
        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          error: "Exploration failed: " + (error as Error).message,
        }));
      }
    },
    [explorationState.graph]
  );

  // Reset exploration
  const resetExploration = useCallback(() => {
    setExplorationState({
      graph: explorationState.graph,
      finalSubgraph: null,
      isExploring: false,
      error: null,
    });
  }, [explorationState.graph]);

  return {
    explorationState,
    buildGraph,
    startExploration,
    resetExploration,
  };
};
