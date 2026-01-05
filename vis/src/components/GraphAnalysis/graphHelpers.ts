import type { FreqMap } from "../../App";
import type { Graph, GraphEdge as GE, GraphNode as GN } from "reagraph";

export interface Recipe {
  index: number;
  title: string;
  ingredients: string;
  directions: string;
  link: string;
  NER_Simple: string;
}

export interface Ingredient {
  ingredient: string;
  weight: number;
}

// Graph data structures
export interface GraphNode extends GN {
  recipe: Recipe;
  visitedCount: number;
  siblings: GraphEdge[];
}

export interface GraphEdge extends GE {
  ingredient: Ingredient;
  sourceNode: GraphNode;
  targetNode: GraphNode;
}

export interface CustomGraph extends Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function randomSample<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// Helper function to create symmetric edge ID
function createSymmetricEdgeId(id1: string, id2: string): string {
  // Convert to numbers for consistent ordering
  const id1Int = parseInt(id1);
  const id2Int = parseInt(id2);

  // Use prime multiplication to create unique but symmetric hash
  const min = Math.min(id1Int, id2Int);
  const max = Math.max(id1Int, id2Int);

  // Large primes to minimize collisions
  const prime1 = 73856093;
  const prime2 = 19349663;

  return `${min * prime1}-${max * prime2}`;
}

export const getIngredientsFromRecipe = (recipe: Recipe): string[] => {
  return (
    recipe.NER_Simple.slice(1, -1)
      .split(",")
      // .map((ing) => ing.trim().replaceAll("'", ""));
      .map((ing) => ing.trim().replaceAll("'", "").replaceAll('"', ""))
  );
};

export function constructRecipeGraph(
  recipes: Recipe[],
  frequencies: FreqMap
): CustomGraph {
  const ingredientRecipeMap = new Map<string, GraphNode[]>();
  const nodeMap = new Map<string, GraphNode>(); // Map to store unique nodes
  // const nodeEdgeMap = new Map<GraphNode, GraphEdge[]>();

  // Create nodes first and store in map
  for (const recipe of recipes) {
    const node: GraphNode = {
      id: recipe.index.toString(),
      recipe: recipe,
      visitedCount: 0,
      siblings: [],
    };
    nodeMap.set(node.id, node);
  }

  // connect ingredients to all recipes that include it - fast lookup
  for (const recipe of recipes) {
    for (const ing of getIngredientsFromRecipe(recipe)) {
      // if ingredient does not have frequency calculated, skip it
      if (!frequencies.has(ing)) {
        console.log("no freq");
        continue;
      }

      const graphNode = nodeMap.get(recipe.index.toString())!; // Get the existing node
      if (ingredientRecipeMap.has(ing)) {
        ingredientRecipeMap.get(ing)?.push(graphNode);
      } else {
        ingredientRecipeMap.set(ing, [graphNode]);
      }
    }
  }

  // create graph
  const nodes: GraphNode[] = Array.from(nodeMap.values()); // Convert map values to array
  const edges: GraphEdge[] = [];

  console.log({ ingredientRecipeMap });

  // connect weighted edges
  ingredientRecipeMap.forEach((recipeNodes, ingredientName) => {
    for (let i = 0; i < recipeNodes.length; i++) {
      const rNode1 = recipeNodes[i];
      for (let j = i + 1; j < recipeNodes.length; j++) {
        const rNode2 = recipeNodes[j];
        const edge: GraphEdge = {
          id: createSymmetricEdgeId(rNode1.id, rNode2.id),
          ingredient: {
            ingredient: ingredientName,
            weight: frequencies.get(ingredientName)!,
          },
          // source
          source: rNode1.id,
          sourceNode: rNode1,
          // target
          target: rNode2.id,
          targetNode: rNode2,
        };
        edges.push(edge);
        rNode1.siblings.push(edge);
        rNode2.siblings.push(edge);
      }
    }
  });

  console.log({ nodes });

  for (const n of nodes) {
    if (n.siblings.length == 0) {
      console.count("no siblings");
    }
  }

  return {
    edges,
    nodes,
  };
}

/**
 * Performs a random walk with restarts from starting nodes
 */
export function randomWalkWithRestarts(
  graph: CustomGraph,
  startNodeIds: string[],
  restartProbability: number,
  maxSteps: number
) {
  // Validate inputs
  if (restartProbability < 0 || restartProbability > 1) {
    throw new Error("restartProbability must be between 0 and 1");
  }

  const idToNodeMap: Map<string, GraphNode> = new Map();

  for (const id of startNodeIds) {
    const foundNode = graph.nodes.find(
      (gn) => gn.recipe.index.toString() == id
    );

    if (!foundNode) {
      continue;
    }
    idToNodeMap.set(id, foundNode);
  }

  let iter = 0;
  // let currNode = idToNodeMap.get(randomSample(startNodeIds))!;
  let currNode = randomSample(graph.nodes);
  console.log("starting", { currNode }, { restartProbability }, { maxSteps });

  // random walk simulation
  while (iter < maxSteps) {
    // visit the node
    iter++;
    currNode.visitedCount++;

    if (Math.random() < restartProbability) {
      // jump to a newly selected jump point
      currNode = idToNodeMap.get(randomSample(startNodeIds))!;
      // console.log("restarted to:", currNode.recipe.title);
    } else {
      // select a sibling node, based on the edges, to jump to
      const weightToVal = (weight: number) => 1 - 20132 / weight;

      // random weighted choice
      const siblings = currNode.siblings; // get sibling edges

      // Handle case when node has no outgoing edges
      if (siblings.length === 0) {
        // const prev = currNode.recipe.title;
        // No outgoing edges, so restart the walk
        currNode = idToNodeMap.get(randomSample(startNodeIds))!;
        // console.log(
        //   "no outgoing edges for",
        //   prev,
        //   "restarting to:",
        //   currNode.recipe.title
        // );
        continue;
      }
      const cumulativeWeight: number = siblings
        .map((ge) => weightToVal(ge.ingredient.weight))
        .reduce((val, curr) => val + curr); // sum all weights
      const generated = Math.random() * cumulativeWeight;

      // find the randomly sampled edge, by summing weights and find where on the number line it falls
      let c = 0;
      for (const s of siblings) {
        const w2v = weightToVal(s.ingredient.weight);
        if (w2v + c >= generated) {
          if (s.source == currNode.id) {
            currNode = s.targetNode;
          } else {
            currNode = s.sourceNode;
          }
          break;
        }
        c += w2v;
      }
      // console.log("jumped to", currNode.recipe.title);
    }
  }

  // console.log("random walk", graph);

  return graph;
}

function onlyUnique<T>(value: T, index: number, array: T[]): boolean {
  return array.indexOf(value) === index;
}

/**
 * Alternative subgraph sampling that ensures connectivity
 */
export function sampleConnectedSubgraph(
  graph: CustomGraph,
  minVisits: number
): CustomGraph {
  // Start with all nodes that meet the criteria
  graph.nodes = graph.nodes.filter((node) => node.visitedCount >= minVisits);
  // graph.edges = graph.edges.filter(onlyUnique);
  // for (const n of graph.nodes) {
  //   console.log("visitedcount", n.visitedCount);
  // }
  return graph;
}
