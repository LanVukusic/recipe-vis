import type {
  Recipe,
  CustomGraph,
  GraphEdge,
  GraphNode,
} from "../../src/components/GraphAnalysis/graphHelpers";

interface RandomWalkPayload {
  graph: {
    nodes: Array<{
      id: string;
      recipe: Recipe;
      visitedCount: number;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      ingredient: { ingredient: string; weight: number };
    }>;
  };
  startNodeIds: string[];
  restartProbability: number;
  maxSteps: number;
  useFilteredGraph: boolean;
  minVisits: number;
}

// Reconstruct the graph with proper types
function reconstructGraph(data: RandomWalkPayload["graph"]): CustomGraph {
  // Create node map first
  const nodeMap = new Map<string, GraphNode>();

  // Create nodes with proper structure
  data.nodes.forEach((nodeData) => {
    const node: GraphNode = {
      id: nodeData.id,
      recipe: nodeData.recipe,
      visitedCount: nodeData.visitedCount,
      siblings: [], // Will be populated after edges are created
    };
    nodeMap.set(node.id, node);
  });

  // Create edges and populate siblings
  const edges: GraphEdge[] = [];
  data.edges.forEach((edgeData) => {
    const sourceNode = nodeMap.get(edgeData.source);
    const targetNode = nodeMap.get(edgeData.target);

    if (sourceNode && targetNode) {
      const edge: GraphEdge = {
        id: edgeData.id,
        source: edgeData.source,
        target: edgeData.target,
        ingredient: edgeData.ingredient,
        sourceNode: sourceNode,
        targetNode: targetNode,
      };

      edges.push(edge);

      // Add to siblings
      sourceNode.siblings.push(edge);
      targetNode.siblings.push(edge);
    }
  });

  // Convert nodes map to array
  const nodes = Array.from(nodeMap.values());

  return {
    nodes,
    edges,
  };
}

// Helper function for random sampling
function randomSample<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// Helper function to get ingredients from recipe
function getIngredientsFromRecipe(recipe: Recipe): string[] {
  return recipe.NER_Simple.slice(1, -1)
    .split(",")
    .map((ing) => ing.trim().replaceAll("'", "").replaceAll('"', ""));
}

// The main random walk algorithm - moved to worker
function randomWalkWithRestarts(
  graph: CustomGraph,
  startNodeIds: string[],
  restartProbability: number,
  maxSteps: number,
  useFilteredGraph: boolean
): CustomGraph {
  if (restartProbability < 0 || restartProbability > 1) {
    throw new Error("restartProbability must be between 0 and 1");
  }

  const idToNodeMap = new Map<string, GraphNode>();
  startNodeIds.forEach((id) => {
    const foundNode = graph.nodes.find(
      (gn) => gn.recipe.index.toString() === id
    );
    if (foundNode) {
      idToNodeMap.set(id, foundNode);
    }
  });

  const allowedEdgeNames = new Set<string>();
  if (useFilteredGraph) {
    startNodeIds
      .map((nid) => idToNodeMap.get(nid))
      .filter(Boolean)
      .forEach((node) => {
        getIngredientsFromRecipe(node!.recipe).forEach(
          allowedEdgeNames.add,
          allowedEdgeNames
        );
      });
  }

  let iter = 0;
  let currNode = randomSample(graph.nodes);

  // Send progress updates periodically
  const progressInterval = Math.max(1, Math.floor(maxSteps / 10));

  while (iter < maxSteps) {
    iter++;
    currNode.visitedCount++;

    // Send progress update every 10% or so
    if (iter % progressInterval === 0) {
      postMessage({
        type: "PROGRESS",
        progress: Math.round((iter / maxSteps) * 100),
        currentStep: iter,
        totalSteps: maxSteps,
      });
    }

    if (Math.random() < restartProbability) {
      // Restart to a random starting node
      const availableStartNodes = Array.from(idToNodeMap.values());
      if (availableStartNodes.length > 0) {
        currNode = randomSample(availableStartNodes);
      }
    } else {
      // Weight function for edge selection
      const weightToVal = (weight: number) => 1 - 20132 / weight;

      const siblings = useFilteredGraph
        ? currNode.siblings.filter((sibling) =>
            allowedEdgeNames.has(sibling.ingredient.ingredient)
          )
        : currNode.siblings;

      if (siblings.length === 0) {
        const availableStartNodes = Array.from(idToNodeMap.values());
        if (availableStartNodes.length > 0) {
          currNode = randomSample(availableStartNodes);
        }
        continue;
      }

      const cumulativeWeight = siblings
        .map((ge) => weightToVal(ge.ingredient.weight))
        .reduce((sum, val) => sum + val, 0);

      const generated = Math.random() * cumulativeWeight;
      let cumulative = 0;

      for (const sibling of siblings) {
        const weightVal = weightToVal(sibling.ingredient.weight);
        if (cumulative + weightVal >= generated) {
          currNode =
            sibling.source === currNode.id
              ? sibling.targetNode
              : sibling.sourceNode;
          break;
        }
        cumulative += weightVal;
      }
    }
  }

  return graph;
}

// Connected subgraph sampling
function sampleConnectedSubgraph(
  graph: CustomGraph,
  minVisits: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const filteredNodes = graph.nodes.filter(
    (node) => node.visitedCount >= minVisits
  );

  // Create a set of filtered node IDs for quick lookup
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));

  // Filter edges to only include those between filtered nodes
  const filteredEdges = graph.edges.filter(
    (edge) =>
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

// Main worker message handler
self.onmessage = async (event) => {
  try {
    const { type, payload } = event.data;

    if (type === "RANDOM_WALK") {
      // Reconstruct the graph from the serialized data
      const graph = reconstructGraph(payload.graph);

      // 1. Run the random walk
      const walkedGraph = randomWalkWithRestarts(
        graph,
        payload.startNodeIds,
        payload.restartProbability,
        payload.maxSteps,
        payload.useFilteredGraph
      );

      // 2. Sample the connected subgraph
      const finalSubgraph = sampleConnectedSubgraph(
        walkedGraph,
        payload.minVisits
      );

      // 3. Prepare result for serialization
      const result = {
        nodes: finalSubgraph.nodes.map((node) => ({
          id: node.id,
          recipe: node.recipe,
          visitedCount: node.visitedCount,
        })),
        edges: finalSubgraph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ingredient: edge.ingredient,
        })),
      };

      // Send completion message
      postMessage({
        type: "COMPLETE",
        result: result,
        progress: 100,
      });
    } else if (type === "ECHO") {
      postMessage({
        type: "ECHO",
        data: payload.data,
      });
    }
  } catch (error) {
    console.error("Worker error:", error);
    postMessage({
      type: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
