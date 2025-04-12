/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { formatCurrency } from "@/lib/utils/formatters";
import { ForceGraphMethods } from "react-force-graph-2d";

// Import ForceGraph2D with no SSR to avoid hydration issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface AgentNetworkProps {
  network: AgentNetworkType;
  onNodeClick: (agent: Agent) => void;
  selectedAgents?: string[];
  processingTransaction?: boolean;
}

// Define node type that matches both our Agent type and what ForceGraph expects
interface GraphNode extends Agent {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

// Define link type for the graph
interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  index?: number;
}

// Define the graph data structure
interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const AgentNetwork = ({
  network,
  onNodeClick,
  selectedAgents = [],
  processingTransaction = false,
}: AgentNetworkProps) => {
  // Use MutableRefObject to match what ForceGraph2D expects
  const graphRef = useRef<ForceGraphMethods>(
    null
  ) as React.MutableRefObject<ForceGraphMethods>;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [hasMounted, setHasMounted] = useState(false);
  const [needsZooming, setNeedsZooming] = useState(true);

  // Handle zoom to fit - extracted as a reusable function
  const zoomToFit = useCallback(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.zoomToFit(400, 60); // 400ms duration, 60px padding
      setNeedsZooming(false);
    }
  }, [graphData.nodes.length]);

  // Set mounted state and initial setup
  useEffect(() => {
    setHasMounted(true);

    // Give the DOM a chance to render fully before initializing
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: rect.height || 600,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update dimensions on resize
  useEffect(() => {
    if (!hasMounted) return;

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 100),
          height: Math.max(rect.height, 100),
        });
        setNeedsZooming(true); // Need to re-zoom after resize
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasMounted]);

  // Ensure dimensions are properly set whenever container changes
  useEffect(() => {
    if (containerRef.current && hasMounted) {
      const rect = containerRef.current.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        (dimensions.width !== rect.width || dimensions.height !== rect.height)
      ) {
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }, [containerRef.current, hasMounted, dimensions]);

  // Create graph data with positioning logic based on current dimensions
  useEffect(() => {
    if (
      !hasMounted ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      network.nodes.length === 0
    ) {
      return;
    }

    // Clone the nodes and calculate positions for a fixed layout
    const nodes: GraphNode[] = network.nodes.map((node) => {
      // For main agent, fixed position at the center top
      if (node.id === "main-agent") {
        return {
          ...node,
          fx: dimensions.width / 2, // Center horizontally
          fy: dimensions.height * 0.2, // Fixed position near the top (20% from top)
        };
      }

      // For other nodes, pre-calculate positions in a semi-circle at the bottom
      const otherNodes = network.nodes.filter((n) => n.id !== "main-agent");
      const indexOfNode = otherNodes.findIndex((n) => n.id === node.id);

      if (indexOfNode !== -1) {
        const totalNodes = otherNodes.length;
        const angleStep = Math.PI / Math.max(1, totalNodes - 1); // Avoid division by zero
        const angle = indexOfNode * angleStep;

        // Calculate position in a semi-circle
        const radiusX = Math.min(dimensions.width, dimensions.height) * 0.8; // Use 30% of smaller dimension for better layout
        const radiusY = Math.min(dimensions.width, dimensions.height) * 0.5; // Use 30% of smaller dimension for better layout

        const x = dimensions.width / 2 + radiusX * Math.cos(angle);
        const y = dimensions.height * 0.7 + radiusY * Math.sin(angle);

        return {
          ...node,
          fx: x,
          fy: y,
        };
      }

      return { ...node };
    });

    // Process links
    const allLinks: GraphLink[] = [];

    // First add existing links from the network
    network.links.forEach((link) => {
      allLinks.push({
        source: typeof link.source === "string" ? link.source : link.source.id,
        target: typeof link.target === "string" ? link.target : link.target.id,
        value: link.value || 1,
      });
    });

    // Add any missing connections to make it all-to-all
    nodes.forEach((sourceNode) => {
      nodes.forEach((targetNode) => {
        if (sourceNode.id !== targetNode.id) {
          // Check if this connection already exists
          const connectionExists = allLinks.some(
            (link) =>
              (getNodeId(link.source) === sourceNode.id &&
                getNodeId(link.target) === targetNode.id) ||
              (getNodeId(link.source) === targetNode.id &&
                getNodeId(link.target) === sourceNode.id)
          );

          if (!connectionExists) {
            allLinks.push({
              source: sourceNode.id,
              target: targetNode.id,
              value: 0.2, // Lower value for unused connections
            });
          }
        }
      });
    });

    setGraphData({ nodes, links: allLinks });
    setNeedsZooming(true);
  }, [network, hasMounted, dimensions]);

  // Center the graph whenever needed
  useEffect(() => {
    if (needsZooming && hasMounted && graphData.nodes.length > 0) {
      // Use a short delay to ensure the graph has rendered
      const timer = setTimeout(() => {
        zoomToFit();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [needsZooming, hasMounted, graphData.nodes.length, zoomToFit]);

  // Agent styling by type
  const agentStyles = {
    main: { color: "#FF6B6B", glowColor: "#FF0045" },
    text: { color: "#4ECDC4", glowColor: "#00FFD1" },
    image: { color: "#1A535C", glowColor: "#00CCFF" },
    data: { color: "#FFE66D", glowColor: "#FFCC00" },
    assistant: { color: "#6B48FF", glowColor: "#7C4DFF" },
  };

  // Extract node id safely
  const getNodeId = (
    node: string | GraphNode | number | { id?: string | number } | undefined
  ): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return node.toString();
    if (!node) return "";
    return (node.id || "").toString();
  };

  // This effect handles the ref assignment after the component is mounted
  useEffect(() => {
    // If we have a graph ref and there are nodes to display, zoom to fit
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 60);
        }
      }, 300);
    }
  }, [graphRef.current, graphData.nodes.length]);

  // Custom node rendering function
  const nodeCanvasObject = (
    node: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const graphNode = node as GraphNode;
    // Safety checks for node positions
    if (
      graphNode.x === undefined ||
      graphNode.y === undefined ||
      !isFinite(graphNode.x) ||
      !isFinite(graphNode.y)
    ) {
      return;
    }

    const label = graphNode.name || "Unknown";
    const fontSize = 14 / globalScale;
    const nodeType = graphNode.type;

    // Node dimensions
    const nodeWidth = Math.max(label.length * 8, 140) / globalScale;
    const nodeHeight = 44 / globalScale;
    const cornerRadius = 6 / globalScale;

    // Get colors
    const isSelected = selectedAgents.includes(graphNode.id);
    const isProcessing = graphNode.status === "processing";
    const baseColor = agentStyles[nodeType]?.color || "#999999";
    const glowColor = agentStyles[nodeType]?.glowColor || "#666666";

    // Get positions
    const nodeX = graphNode.x;
    const nodeY = graphNode.y;

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw glow effect for selected or processing nodes
    if (isSelected || (processingTransaction && isProcessing)) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw rounded rectangle node
    ctx.beginPath();
    ctx.moveTo(nodeX - nodeWidth / 2 + cornerRadius, nodeY - nodeHeight / 2);
    ctx.lineTo(nodeX + nodeWidth / 2 - cornerRadius, nodeY - nodeHeight / 2);
    ctx.arcTo(
      nodeX + nodeWidth / 2,
      nodeY - nodeHeight / 2,
      nodeX + nodeWidth / 2,
      nodeY - nodeHeight / 2 + cornerRadius,
      cornerRadius
    );
    ctx.lineTo(nodeX + nodeWidth / 2, nodeY + nodeHeight / 2 - cornerRadius);
    ctx.arcTo(
      nodeX + nodeWidth / 2,
      nodeY + nodeHeight / 2,
      nodeX + nodeWidth / 2 - cornerRadius,
      nodeY + nodeHeight / 2,
      cornerRadius
    );
    ctx.lineTo(nodeX - nodeWidth / 2 + cornerRadius, nodeY + nodeHeight / 2);
    ctx.arcTo(
      nodeX - nodeWidth / 2,
      nodeY + nodeHeight / 2,
      nodeX - nodeWidth / 2,
      nodeY + nodeHeight / 2 - cornerRadius,
      cornerRadius
    );
    ctx.lineTo(nodeX - nodeWidth / 2, nodeY - nodeHeight / 2 + cornerRadius);
    ctx.arcTo(
      nodeX - nodeWidth / 2,
      nodeY - nodeHeight / 2,
      nodeX - nodeWidth / 2 + cornerRadius,
      nodeY - nodeHeight / 2,
      cornerRadius
    );
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(
      nodeX - nodeWidth / 2,
      nodeY - nodeHeight / 2,
      nodeX + nodeWidth / 2,
      nodeY + nodeHeight / 2
    );
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustColor(baseColor, -20));
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add a border with neon glow effect
    ctx.strokeStyle = isSelected ? glowColor : adjustColor(baseColor, 30);
    ctx.lineWidth = isSelected ? 2 / globalScale : 1.5 / globalScale;
    ctx.stroke();

    // Draw node name
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowBlur = 0; // Turn off shadow for text
    ctx.fillText(label, nodeX, nodeY - fontSize * 0.2);

    // Draw balance beneath the node name
    ctx.font = `${fontSize * 0.8}px Arial`;
    ctx.fillStyle = "#FFFFFF99";
    ctx.fillText(
      formatCurrency(graphNode.balance || 0),
      nodeX,
      nodeY + fontSize * 0.9
    );

    ctx.restore();
  };

  // Helper to adjust color brightness
  const adjustColor = (color: string, amount: number): string => {
    const clamp = (val: number) => Math.min(255, Math.max(0, val));

    // Convert hex to RGB
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Adjust each component
    const newR = clamp(r + amount);
    const newG = clamp(g + amount);
    const newB = clamp(b + amount);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  };

  // Show a loading placeholder if not mounted yet
  if (!hasMounted) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-gray-900"
      >
        <div className="text-center">
          <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  // Handle node click with proper type conversion
  const handleNodeClick = (node: any) => {
    const graphNode = node as GraphNode;
    onNodeClick(graphNode);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-900">
      {hasMounted && graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef as React.MutableRefObject<ForceGraphMethods>}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const graphNode = node as GraphNode;
            if (
              graphNode.x === undefined ||
              graphNode.y === undefined ||
              !isFinite(graphNode.x) ||
              !isFinite(graphNode.y)
            ) {
              return;
            }

            const label = graphNode.name || "Unknown";
            const nodeWidth =
              Math.max(label.length * 8, 140) / ctx.getTransform().a;
            const nodeHeight = 44 / ctx.getTransform().a;
            const cornerRadius = 6 / ctx.getTransform().a;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(
              graphNode.x - nodeWidth / 2 + cornerRadius,
              graphNode.y - nodeHeight / 2
            );
            ctx.lineTo(
              graphNode.x + nodeWidth / 2 - cornerRadius,
              graphNode.y - nodeHeight / 2
            );
            ctx.arcTo(
              graphNode.x + nodeWidth / 2,
              graphNode.y - nodeHeight / 2,
              graphNode.x + nodeWidth / 2,
              graphNode.y - nodeHeight / 2 + cornerRadius,
              cornerRadius
            );
            ctx.lineTo(
              graphNode.x + nodeWidth / 2,
              graphNode.y + nodeHeight / 2 - cornerRadius
            );
            ctx.arcTo(
              graphNode.x + nodeWidth / 2,
              graphNode.y + nodeHeight / 2,
              graphNode.x + nodeWidth / 2 - cornerRadius,
              graphNode.y + nodeHeight / 2,
              cornerRadius
            );
            ctx.lineTo(
              graphNode.x - nodeWidth / 2 + cornerRadius,
              graphNode.y + nodeHeight / 2
            );
            ctx.arcTo(
              graphNode.x - nodeWidth / 2,
              graphNode.y + nodeHeight / 2,
              graphNode.x - nodeWidth / 2,
              graphNode.y + nodeHeight / 2 - cornerRadius,
              cornerRadius
            );
            ctx.lineTo(
              graphNode.x - nodeWidth / 2,
              graphNode.y - nodeHeight / 2 + cornerRadius
            );
            ctx.arcTo(
              graphNode.x - nodeWidth / 2,
              graphNode.y - nodeHeight / 2,
              graphNode.x - nodeWidth / 2 + cornerRadius,
              graphNode.y - nodeHeight / 2,
              cornerRadius
            );
            ctx.closePath();
            ctx.fill();
          }}
          nodeRelSize={10}
          linkWidth={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            // Highlight links involved in active transactions
            if (
              processingTransaction &&
              ((source === "main-agent" && selectedAgents.includes(target)) ||
                (target === "main-agent" && selectedAgents.includes(source)))
            ) {
              return 2;
            }

            // Base width on value
            return 0.5;
          }}
          linkColor={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            // Get target node color for the link
            const targetNode = graphData.nodes.find(
              (n) => n.id === target
            ) as GraphNode;

            if (
              processingTransaction &&
              ((source === "main-agent" && selectedAgents.includes(target)) ||
                (target === "main-agent" && selectedAgents.includes(source)))
            ) {
              // Bright link for active transactions
              return targetNode && targetNode.type
                ? agentStyles[targetNode.type]?.glowColor || "#FFFFFF"
                : "#FFFFFF";
            }

            // Semi-transparent link for regular connections
            return "rgba(80, 80, 255, 0.8)";
          }}
          onNodeClick={handleNodeClick}
          cooldownTicks={50} // Limited cooling for stability
          d3AlphaDecay={0.02} // Slower decay for more stable positioning
          d3VelocityDecay={0.2} // Lower value for smoother movement
          linkDirectionalParticles={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            const value = link.value as number;

            // Show particles for active transactions
            if (
              processingTransaction &&
              source === "main-agent" &&
              selectedAgents.includes(target)
            ) {
              return 6; // More particles for active transactions
            }

            // Show fewer particles for regular connections based on value
            return value > 0.5 ? Math.min(Math.ceil(value), 3) : 0;
          }}
          linkDirectionalParticleSpeed={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            if (
              processingTransaction &&
              source === "main-agent" &&
              selectedAgents.includes(target)
            ) {
              return 0.005; // Faster particles for active transactions
            }

            return 0.002; // Regular speed
          }}
          linkDirectionalParticleWidth={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            if (
              processingTransaction &&
              source === "main-agent" &&
              selectedAgents.includes(target)
            ) {
              return 8; // Larger particles for active transactions
            }

            return 2; // Regular size
          }}
          linkDirectionalParticleColor={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            if (
              processingTransaction &&
              source === "main-agent" &&
              selectedAgents.includes(target)
            ) {
              // Get target node color for transaction particles
              const targetNode = graphData.nodes.find(
                (n) => n.id === target
              ) as GraphNode;
              if (targetNode && targetNode.type) {
                return agentStyles[targetNode.type]?.glowColor || "#FFE066";
              }
              return "#FFE066"; // Default to yellow if node not found
            }

            return "#FFFFFF33"; // Semi-transparent white for regular particles
          }}
          backgroundColor="#0F172A" // Dark blue background
          onEngineStop={() => {
            // When the simulation stops, ensure we're centered properly
            if (graphRef.current) {
              zoomToFit();
            }
          }}
        />
      )}
    </div>
  );
};

export default AgentNetwork;
