import { useState, useCallback } from "react";
import {
  type Recipe,
  type GraphNode,
  type GraphEdge,
  constructRecipeGraph,
  randomWalkWithRestarts,
  sampleConnectedSubgraph,
} from "./graphHelpers";
import type { Graph } from "reagraph";
import type { FreqMap } from "../../App";

export interface ExplorationState {
  graph: Graph | null;
  finalSubgraph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  isExploring: boolean;
  path: string[];
  error: string | null;
  visitCounts: Map<string, number> | null;
}

export const useNeighborhoodExploration = (ingredientFrequencies: FreqMap) => {
  const [explorationState, setExplorationState] = useState<ExplorationState>({
    graph: null,
    finalSubgraph: null,
    isExploring: false,
    path: [],
    error: null,
    visitCounts: null,
  });

  // Build the graph from recipes
  const buildGraph = useCallback(
    (recipes: Recipe[]) => {
      try {
        console.log("BG", { ingredientFrequencies });

        const graph = constructRecipeGraph(recipes, ingredientFrequencies);
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
    [ingredientFrequencies]
  );

  // Start exploration from a specific recipe
  const startExploration = useCallback(
    async (
      recipes: Recipe[],
      startingRecipes: Recipe[],
      restartProbability: number,
      maxSteps: number,
      minVisits: number
    ) => {
      const graph = buildGraph(recipes);
      if (!graph) return;

      console.log(`starting with ${recipes.length} recipes`);

      setExplorationState((prev) => ({
        ...prev,
        isExploring: true,
        path: [],
      }));

      try {
        console.log("trying ranom walk");

        // Perform the complete random walk
        const walkResult = randomWalkWithRestarts(
          graph,
          startingRecipes.map((recipe) => recipe.index.toString()),
          restartProbability,
          maxSteps
        );

        console.log({ walkResult });

        // Get the final subgraph
        const finalSubgraph = sampleConnectedSubgraph(walkResult, minVisits);

        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          finalSubgraph,
        }));
      } catch (error) {
        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          error: "Exploration failed: " + (error as Error).message,
        }));
      }
    },
    [buildGraph]
  );

  // Reset exploration
  const resetExploration = useCallback(() => {
    setExplorationState({
      graph: null,
      finalSubgraph: null,
      isExploring: false,
      path: [],
      error: null,
      visitCounts: null,
    });
  }, []);

  return {
    explorationState,
    buildGraph,
    startExploration,
    resetExploration,
  };
};
