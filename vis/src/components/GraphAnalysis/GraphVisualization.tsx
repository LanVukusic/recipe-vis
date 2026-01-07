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

import { useMemo, memo, useCallback } from "react";

const GraphVisualizationComponent = ({
  nodes = [],
  edges = [],
  onNodeClick,
  selectedNodes,
}: GraphVisualizationProps) => {
  const selectedIds = useMemo(
    () => selectedNodes.map((n) => n.index.toString()),
    [selectedNodes]
  );

  const reagraphNodes = useMemo(() => {
    return nodes.map((node) => {
      // Get visit count for this node if available
      // const visitCount = visitCounts?.get(node.id) || 0;

      return {
        id: node.id,
        size: node.visitedCount,
        fill: selectedIds.includes(node.recipe.index.toString())
          ? "#9f9fa9"
          : "#fcc800",
        label: node.recipe.title,
      };
    });
  }, [nodes, selectedIds]);

  const handleNodeClick = useCallback(
    (nodeId: { id: string }) => {
      const clickedNode = nodes.find((n) => n.id === nodeId.id);
      if (clickedNode && onNodeClick) {
        onNodeClick(clickedNode);
      }
    },
    [nodes, onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <GraphCanvas
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
        draggable
        nodes={reagraphNodes}
        edges={edges}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};

export const GraphVisualization = memo(GraphVisualizationComponent);
