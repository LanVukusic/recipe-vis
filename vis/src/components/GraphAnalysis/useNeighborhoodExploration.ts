import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  finalSubgraph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  isExploring: boolean;
  error: string | null;
}

/**
 * Creates a lightweight copy of the graph for random walks
 * Only copies essential data and resets visit counts
 */
function createLightweightGraphCopy(originalGraph: CustomGraph): CustomGraph {
  // Create node map for quick lookup
  const nodeMap = new Map<string, GraphNode>();

  // Create minimal node copies with reset visit counts
  const nodes = originalGraph.nodes.map((node) => {
    const newNode: GraphNode = {
      id: node.id,
      recipe: node.recipe,
      visitedCount: 0, // Reset for each walk
      siblings: [], // Will rebuild references
    };
    nodeMap.set(node.id, newNode);
    return newNode;
  });

  // Create edge copies with proper node references
  const edges = originalGraph.edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      throw new Error(`Node not found for edge ${edge.id}`);
    }

    const newEdge: GraphEdge = {
      id: edge.id,
      ingredient: { ...edge.ingredient },
      source: edge.source,
      sourceNode: sourceNode,
      target: edge.target,
      targetNode: targetNode,
    };

    // Add edge to both nodes' siblings
    sourceNode.siblings.push(newEdge);
    targetNode.siblings.push(newEdge);

    return newEdge;
  });

  return {
    nodes,
    edges,
  };
}

export const useNeighborhoodExploration = (
  ingredientFrequencies: FreqMap,
  recipes: Recipe[]
) => {
  // USE REF FOR LARGE GRAPH OBJECT - doesn't trigger re-renders
  const graphRef = useRef<CustomGraph | null>(null);

  // STATE ONLY FOR UI-RELATED DATA
  const [explorationState, setExplorationState] = useState<ExplorationState>({
    finalSubgraph: null,
    isExploring: false,
    error: null,
  });

  // Memoize ingredientFrequencies to prevent unnecessary rebuilds
  const memoizedFrequencies = useMemo(
    () => ingredientFrequencies,
    [ingredientFrequencies]
  );

  // Build the graph from recipes - store in ref, not state
  const buildGraph = useCallback(
    (recipes: Recipe[]) => {
      try {
        console.log("BG", { ingredientFrequencies: memoizedFrequencies });

        const graph = constructRecipeGraph(recipes, memoizedFrequencies);
        console.log("created graph: ", graph);

        // ✅ Store in ref instead of state
        graphRef.current = graph;

        setExplorationState((prev) => ({
          ...prev,
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

  // Build graph when recipes change
  useEffect(() => {
    if (recipes.length === 0) {
      return;
    }

    // ✅ Debounce rapid recipe changes
    const timeoutId = setTimeout(() => {
      buildGraph(recipes);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [recipes, buildGraph]);

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
      if (!graphRef.current) {
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
        error: null, // Clear previous errors
      }));

      try {
        console.log("starting random walk");

        // ✅ Use lightweight copy instead of structuredClone
        const graphCopy = createLightweightGraphCopy(graphRef.current);

        // Perform the complete random walk
        const walkResult = randomWalkWithRestarts(
          graphCopy,
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
        }));
      } catch (error) {
        console.error("Exploration error:", error);
        setExplorationState((prev) => ({
          ...prev,
          isExploring: false,
          error: "Exploration failed: " + (error as Error).message,
        }));
      }
    },
    [] // ✅ Empty dependency array - graphRef doesn't change reference
  );

  // Reset exploration
  const resetExploration = useCallback(() => {
    setExplorationState({
      finalSubgraph: null,
      isExploring: false,
      error: null,
    });
  }, []);

  // ✅ Expose graph for debugging/other purposes if needed
  const getGraph = useCallback(() => {
    return graphRef.current;
  }, []);

  return {
    explorationState,
    buildGraph,
    startExploration,
    resetExploration,
    getGraph, // Optional: for external access to the graph
  };
};
