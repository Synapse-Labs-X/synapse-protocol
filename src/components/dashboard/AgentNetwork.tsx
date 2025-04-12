/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from "react";
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
  const graphRef = useRef<ForceGraphMethods>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [hasMounted, setHasMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Create graph data with positioning logic
  useEffect(() => {
    if (!hasMounted) return;

    // Clone the nodes and calculate positions for a fixed layout
    const nodes: GraphNode[] = network.nodes.map((node) => {
      // For main agent, fixed position at the top (north)
      if (node.id === "main-agent") {
        return {
          ...node,
          fx: dimensions.width / 2, // Center horizontally
          fy: 70, // Fixed position at the top
        };
      }

      // For other nodes, pre-calculate positions in a semi-circle around the bottom
      const otherNodes = network.nodes.filter((n) => n.id !== "main-agent");
      const indexOfNode = otherNodes.findIndex((n) => n.id === node.id);

      if (indexOfNode !== -1) {
        const totalNodes = otherNodes.length;
        const angleStep = Math.PI / totalNodes;
        const angle = indexOfNode * angleStep;

        // Calculate position in a semi-circle
        const radius = Math.min(dimensions.width, dimensions.height);
        const x =
          dimensions.width / 2 + radius * Math.cos(angle + Math.PI / 14);
        const y =
          dimensions.height * 0.6 + radius * Math.sin(angle + Math.PI / 14);

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
  }, [network, hasMounted, dimensions]);

  // Agent styling by type
  const agentStyles = {
    main: { color: "#FF6B6B", glowColor: "#FF0045" },
    text: { color: "#4ECDC4", glowColor: "#00FFD1" },
    image: { color: "#1A535C", glowColor: "#00CCFF" },
    data: { color: "#FFE66D", glowColor: "#FFCC00" },
    assistant: { color: "#6B48FF", glowColor: "#7C4DFF" },
  };

  // Update dimensions on resize
  useEffect(() => {
    if (!hasMounted) return;

    const handleResize = () => {
      const container = document.getElementById("graph-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasMounted]);

  // Extract node id safely
  const getNodeId = (
    node: string | GraphNode | number | { id?: string | number } | undefined
  ): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return node.toString();
    if (!node) return "";
    return (node.id || "").toString();
  };

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
        id="graph-container"
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
    <div id="graph-container" className="w-full h-full relative bg-gray-900">
      {hasMounted && (
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
            const value = link.value as number;
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
          cooldownTicks={0}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.1}
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
          // Disable physics simulation since we're using fixed positions
          cooldownTime={0}
        />
      )}
    </div>
  );
};

export default AgentNetwork;
