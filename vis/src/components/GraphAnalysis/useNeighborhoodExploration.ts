import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  type Recipe,
  type GraphNode,
  type GraphEdge,
  constructRecipeGraph,
  type CustomGraph,
} from "./graphHelpers";
import type { FreqMap } from "../../App";

export interface ExplorationState {
  finalSubgraph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  isExploring: boolean;
  error: string | null;
  progress: number | null;
  currentStep: number | null;
  totalSteps: number | null;
}

// Keep the lightweight copy function
function createLightweightGraphCopy(originalGraph: CustomGraph): CustomGraph {
  return {
    nodes: originalGraph.nodes.map((node) => ({
      ...node,
      visitedCount: 0,
      siblings: [...node.siblings],
    })),
    edges: [...originalGraph.edges],
  };
}

export const useNeighborhoodExploration = (
  ingredientFrequencies: FreqMap,
  recipes: Recipe[]
) => {
  const graphRef = useRef<CustomGraph | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isMountedRef = useRef(true);

  const [explorationState, setExplorationState] = useState<ExplorationState>({
    finalSubgraph: null,
    isExploring: false,
    error: null,
    progress: null,
    currentStep: null,
    totalSteps: null,
  });

  const memoizedFrequencies = useMemo(
    () => ingredientFrequencies,
    [ingredientFrequencies]
  );

  const buildGraph = useCallback(
    (recipes: Recipe[]) => {
      try {
        const graph = constructRecipeGraph(recipes, memoizedFrequencies);
        graphRef.current = graph;
        setExplorationState((prev) => ({
          ...prev,
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
    },
    [memoizedFrequencies]
  );

  useEffect(() => {
    if (!recipes) {
      return;
    }
    buildGraph(recipes);
  }, [buildGraph, recipes]);

  // Initialize the worker with proper error handling
  useEffect(() => {
    isMountedRef.current = true;

    // Create worker only once
    if (!workerRef.current) {
      try {
        console.log("Initializing worker...");
        // Use dynamic import for better TypeScript support
        const worker = new Worker(
          new URL("/workers/randomWalker.ts", import.meta.url),
          {
            type: "module",
          }
        );
        workerRef.current = worker;

        // Set up message handler
        worker.onmessage = (event) => {
          const {
            type,
            data,
            result,
            progress,
            currentStep,
            totalSteps,
            error,
          } = event.data;

          if (!isMountedRef.current) return;

          switch (type) {
            case "PROGRESS":
              setExplorationState((prev) => ({
                ...prev,
                progress: progress || prev.progress,
                currentStep: currentStep || prev.currentStep,
                totalSteps: totalSteps || prev.totalSteps,
              }));
              break;

            case "COMPLETE":
              setExplorationState((prev) => ({
                ...prev,
                finalSubgraph: result,
                isExploring: false,
                progress: 100,
                currentStep: totalSteps,
                totalSteps: totalSteps,
              }));
              console.log("Exploration completed successfully");
              break;

            case "ERROR":
              setExplorationState((prev) => ({
                ...prev,
                isExploring: false,
                error: `Worker error: ${error}`,
                progress: null,
                currentStep: null,
                totalSteps: null,
              }));
              console.error("Worker reported error:", error);
              break;

            case "ECHO":
              console.log("Worker echo response:", data);
              break;
          }
        };

        // Set up error handler
        worker.onerror = (error) => {
          if (!isMountedRef.current) return;

          console.error("Worker error:", error);
          setExplorationState((prev) => ({
            ...prev,
            isExploring: false,
            error: `Worker initialization error: ${error.message}`,
            progress: null,
            currentStep: null,
            totalSteps: null,
          }));
        };

        // Send initialization message
        worker.postMessage({
          type: "ECHO",
          payload: { data: "Worker is ready!" },
        });
      } catch (error) {
        console.error("Failed to initialize worker:", error);
        setExplorationState((prev) => ({
          ...prev,
          error: `Failed to initialize worker: ${(error as Error).message}`,
        }));
      }
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up worker...");
      isMountedRef.current = false;

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Start exploration with proper worker communication
  const startExploration = useCallback(
    async (
      startingRecipes: Recipe[],
      restartProbability: number,
      maxSteps: number,
      minVisits: number,
      useFilteredGraph: boolean
    ) => {
      if (!graphRef.current || !workerRef.current) {
        console.error("No graph or worker available");
        setExplorationState((prev) => ({
          ...prev,
          error:
            "Graph or worker not available. Please wait for initialization.",
          isExploring: false,
        }));
        return;
      }

      setExplorationState((prev) => ({
        ...prev,
        isExploring: true,
        error: null,
        finalSubgraph: null,
        progress: 0,
        currentStep: 0,
        totalSteps: maxSteps,
      }));

      try {
        const graphCopy = createLightweightGraphCopy(graphRef.current);

        // Prepare payload for worker (only send serializable data)
        const payload = {
          graph: {
            nodes: graphCopy.nodes.map((n) => ({
              id: n.id,
              recipe: n.recipe,
              visitedCount: n.visitedCount,
            })),
            edges: graphCopy.edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              ingredient: e.ingredient,
            })),
          },
          startNodeIds: startingRecipes.map((r) => r.index.toString()),
          restartProbability,
          maxSteps,
          minVisits,
          useFilteredGraph,
        };

        console.log("Sending random walk request to worker...");
        workerRef.current.postMessage({
          type: "RANDOM_WALK",
          payload,
        });
      } catch (error) {
        console.error("Exploration error:", error);
        if (isMountedRef.current) {
          setExplorationState((prev) => ({
            ...prev,
            isExploring: false,
            error: "Exploration failed: " + (error as Error).message,
            progress: null,
            currentStep: null,
            totalSteps: null,
          }));
        }
      }
    },
    []
  );

  const resetExploration = useCallback(() => {
    setExplorationState({
      finalSubgraph: null,
      isExploring: false,
      error: null,
      progress: null,
      currentStep: null,
      totalSteps: null,
    });
  }, []);

  const getGraph = useCallback(() => {
    return graphRef.current;
  }, []);

  return {
    explorationState,
    buildGraph,
    startExploration,
    resetExploration,
    getGraph,
  };
};
