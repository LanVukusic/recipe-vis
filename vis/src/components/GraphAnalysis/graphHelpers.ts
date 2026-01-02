export interface Recipe {
  index: number;
  title: string;
  ingredients: string;
  directions: string;
  link: string;
  NER_Simple: string;
}

// Graph data structures
export interface GraphNode {
  id: string;
  label: string;
  recipe: Recipe;
  visited?: boolean;
  distance?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  adjacencyList: Map<string, string[]>;
}

/**
 * Constructs a graph where nodes are recipes and edges connect recipes that share common ingredients
 */
export function constructRecipeGraph(recipes: Recipe[]): Graph {
  const nodes: GraphNode[] = recipes.map((recipe) => ({
    id: recipe.index.toString(),
    label: recipe.title,
    recipe,
  }));

  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const adjacencyList = new Map<string, string[]>();

  // Populate node map
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    adjacencyList.set(node.id, []);
  });

  // Create edges between recipes that share common ingredients
  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const recipe1 = recipes[i];
      const recipe2 = recipes[j];

      const ingredients1 = new Set(
        recipe1.NER_Simple.split(",").map((ing) => ing.trim().toLowerCase())
      );
      const ingredients2 = new Set(
        recipe2.NER_Simple.split(",").map((ing) => ing.trim().toLowerCase())
      );

      // Find common ingredients
      const commonIngredients = [...ingredients1].filter((ing) =>
        ingredients2.has(ing)
      );

      if (commonIngredients.length > 0) {
        const edgeId = `${recipe1.index}-${recipe2.index}`;
        const edge: GraphEdge = {
          id: edgeId,
          source: recipe1.index.toString(),
          target: recipe2.index.toString(),
          weight: commonIngredients.length, // Weight based on number of shared ingredients
        };

        edges.push(edge);

        // Add to adjacency list
        const adj1 = adjacencyList.get(recipe1.index.toString()) || [];
        adj1.push(recipe2.index.toString());
        adjacencyList.set(recipe1.index.toString(), adj1);

        const adj2 = adjacencyList.get(recipe2.index.toString()) || [];
        adj2.push(recipe1.index.toString());
        adjacencyList.set(recipe2.index.toString(), adj2);
      }
    }
  }

  return {
    nodes,
    edges,
    nodeMap,
    adjacencyList,
  };
}

/**
 * Performs a random walk with restarts from a starting recipe
 */
export function randomWalkWithRestarts(
  graph: Graph,
  startNodeId: string,
  restartProbability: number,
  maxSteps: number
): {
  visitedNodes: GraphNode[];
  visitedEdges: GraphEdge[];
  path: string[];
} {
  const visitedNodes = new Set<GraphNode>();
  const visitedEdges = new Set<GraphEdge>();
  const path: string[] = [];
  const nodeVisits = new Map<string, number>();

  let currentNodeId = startNodeId;
  path.push(currentNodeId);
  visitedNodes.add(graph.nodeMap.get(currentNodeId)!);

  for (let step = 0; step < maxSteps; step++) {
    // Check if we should restart
    if (Math.random() < restartProbability && step > 0) {
      currentNodeId = startNodeId;
      path.push(`RESTART->${startNodeId}`);
      continue;
    }

    const neighbors = graph.adjacencyList.get(currentNodeId) || [];

    if (neighbors.length === 0) {
      // If no neighbors, restart or stop
      if (Math.random() < restartProbability) {
        currentNodeId = startNodeId;
        path.push(`RESTART->${startNodeId}`);
      } else {
        break;
      }
    } else {
      // Choose a random neighbor
      const randomNeighbor =
        neighbors[Math.floor(Math.random() * neighbors.length)];
      const edgeId = `${currentNodeId}-${randomNeighbor}`;
      const reverseEdgeId = `${randomNeighbor}-${currentNodeId}`;

      // Find the edge in the graph
      const edge = graph.edges.find(
        (e) => e.id === edgeId || e.id === reverseEdgeId
      );
      if (edge) {
        visitedEdges.add(edge);
      }

      currentNodeId = randomNeighbor;
      path.push(currentNodeId);

      const node = graph.nodeMap.get(currentNodeId);
      if (node) {
        visitedNodes.add(node);

        // Track visit count for visualization
        const visits = nodeVisits.get(currentNodeId) || 0;
        nodeVisits.set(currentNodeId, visits + 1);
      }
    }
  }

  return {
    visitedNodes: Array.from(visitedNodes),
    visitedEdges: Array.from(visitedEdges),
    path,
  };
}

/**
 * Samples a subgraph based on random walk results
 */
export function sampleSubgraph(
  graph: Graph,
  visitedNodes: GraphNode[],
  visitedEdges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visitedNodeIds = new Set(visitedNodes.map((node) => node.id));

  // Include all visited nodes and their connecting edges
  const subgraphEdges = visitedEdges.filter(
    (edge) => visitedNodeIds.has(edge.source) && visitedNodeIds.has(edge.target)
  );

  return {
    nodes: visitedNodes,
    edges: subgraphEdges,
  };
}

/**
 * Gets neighbors of a specific node
 */
export function getNodeNeighbors(graph: Graph, nodeId: string): GraphNode[] {
  const neighbors = graph.adjacencyList.get(nodeId) || [];
  return neighbors.map((neighborId) => graph.nodeMap.get(neighborId)!);
}
