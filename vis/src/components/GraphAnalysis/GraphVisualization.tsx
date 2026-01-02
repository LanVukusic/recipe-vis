import { GraphCanvas, lightTheme } from "reagraph";
import type { GraphNode, GraphEdge } from "./graphHelpers";

interface GraphVisualizationProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  disabled?: boolean;
}

function GraphVisualization({
  nodes = [],
  edges = [],
  onNodeClick,
  disabled = false,
}: GraphVisualizationProps) {
  const reagraphNodes = nodes.map((node) => ({
    id: node.id,
    label: node.label,
    ...node.recipe, // Include recipe data for potential use
  }));

  const reagraphEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: `Weight: ${edge.weight}`,
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

export default GraphVisualization;
