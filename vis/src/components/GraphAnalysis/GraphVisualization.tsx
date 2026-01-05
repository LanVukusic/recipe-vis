import { GraphCanvas, lightTheme } from "reagraph";
import type { GraphNode, GraphEdge, Recipe } from "./graphHelpers";

interface GraphVisualizationProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  visitCounts?: Map<string, number> | null;
  onNodeClick?: (node: GraphNode) => void;
  disabled?: boolean;
  selectedNodes: Recipe[];
}

function GraphVisualization({
  nodes = [],
  edges = [],
  onNodeClick,
  disabled = false,
  selectedNodes,
}: GraphVisualizationProps) {
  const reagraphNodes = nodes.map((node) => {
    // Get visit count for this node if available
    // const visitCount = visitCounts?.get(node.id) || 0;
    const selectedIds = selectedNodes.map((n) => n.index.toString());

    return {
      id: node.id,
      ...node.recipe, // Include recipe data for potential use
      size: node.visitedCount,
      // size: Math.max(120, Math.min(120, node.visitedCount * 2)),
      fill: selectedIds.includes(node.recipe.index.toString())
        ? "#9f9fa9"
        : "#fcc800",
      // fill:
      //   node.visitedCount > 0
      //     ? `hsl(${120 - Math.min(120, node.visitedCount * 10)}, 100%, 50%)`
      //     : "#fcc800", // Green to red based on visit count
      label: node.recipe.title,
    };
  });

  const reagraphEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    arrowPlacement: "none" as const,
  }));

  return (
    <div className="w-full h-full">
      <GraphCanvas
        disabled={disabled}
        theme={{
          ...lightTheme,
          canvas: {
            background: "#27272a",
          },
          node: {
            ...lightTheme.node,
            fill: "#fcc800",
          },
          edge: {
            ...lightTheme.edge,
            opacity: 0.6,
          },
        }}
        nodes={reagraphNodes}
        edges={reagraphEdges}
        onNodeClick={(nodeId) => {
          const clickedNode = nodes.find((n) => n.id === nodeId.id);
          if (clickedNode && onNodeClick) {
            onNodeClick(clickedNode);
          }
        }}
      />
    </div>
  );
}

export { GraphVisualization };
