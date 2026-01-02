import { useState, useCallback } from "react";
import {
  type Recipe,
  type Graph,
  type GraphNode,
  type GraphEdge,
  constructRecipeGraph,
  randomWalkWithRestarts,
  sampleSubgraph,
} from "./graphHelpers";

export interface ExplorationState {
  graph: Graph | null;
  finalSubgraph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  isExploring: boolean;
  path: string[];
  error: string | null;
}

export const useNeighborhoodExploration = () => {
  const [explorationState, setExplorationState] = useState<ExplorationState>({
    graph: null,
    finalSubgraph: null,
    isExploring: false,
    path: [],
    error: null,
  });

  // Build the graph from recipes
  const buildGraph = useCallback((recipes: Recipe[]) => {
    try {
      const graph = constructRecipeGraph(recipes);
      setExplorationState((prev) => ({
        ...prev,
        graph,
        error: null,
      }));
      return graph;
    } catch (error) {
      setExplorationState((prev) => ({
        ...prev,
        error: "Failed to build graph: " + (error as Error).message,
      }));
      return null;
    }
  }, []);

  // Start exploration from a specific recipe
  const startExploration = useCallback(
    async (
      recipes: Recipe[],
      startRecipeIndex: number,
      restartProbability: number,
      maxSteps: number
    ) => {
      const graph = buildGraph(recipes);
      if (!graph) return;

      setExplorationState((prev) => ({
        ...prev,
        isExploring: true,
        path: [],
      }));

      try {
        // Perform the complete random walk
        const walkResult = randomWalkWithRestarts(
          graph,
          startRecipeIndex.toString(),
          restartProbability,
          maxSteps
        );

        // Get the final subgraph
        const finalSubgraph = sampleSubgraph(
          graph,
          walkResult.visitedNodes,
          walkResult.visitedEdges
        );

        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          finalSubgraph,
          path: walkResult.path,
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
    });
  }, []);

  return {
    explorationState,
    buildGraph,
    startExploration,
    resetExploration,
  };
};
