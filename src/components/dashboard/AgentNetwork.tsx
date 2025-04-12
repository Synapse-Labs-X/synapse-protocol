import React, { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Cpu, Bot, BarChart2, Layers, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

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

// Extended Graph Node type to handle force graph properties
interface GraphNode extends Agent {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  index?: number;
}

const AgentNetwork = ({
  network,
  onNodeClick,
  selectedAgents = [],
  processingTransaction = false,
}: AgentNetworkProps) => {
  const graphRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [hasMounted, setHasMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Create all-to-all connections between agents
  useEffect(() => {
    if (!hasMounted) return;

    const nodes = network.nodes.map((node) => ({
      ...node,
    }));

    // Create links for all-to-all connections
    const allLinks = [];

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
  }, [network, hasMounted]);

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
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    // Safety checks for node positions
    if (
      node.x === undefined ||
      node.y === undefined ||
      !isFinite(node.x) ||
      !isFinite(node.y)
    ) {
      return;
    }

    const label = node.name || "Unknown";
    const fontSize = 14 / globalScale;
    const nodeType = node.type;

    // Node dimensions
    const nodeWidth = Math.max(label.length * 8, 140) / globalScale;
    const nodeHeight = 44 / globalScale;
    const cornerRadius = 6 / globalScale;

    // Get colors
    const isSelected = selectedAgents.includes(node.id);
    const isProcessing = node.status === "processing";
    const baseColor = agentStyles[nodeType]?.color || "#999999";
    const glowColor = agentStyles[nodeType]?.glowColor || "#666666";

    // Get positions
    const nodeX = node.x;
    const nodeY = node.y;

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
      formatCurrency(node.balance || 0),
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

  return (
    <div id="graph-container" className="w-full h-full relative bg-gray-900">
      {hasMounted && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node, color, ctx) => {
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
            return Math.max(0.5, value);
          }}
          linkColor={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            // Get target node color for the link
            const targetNode = graphData.nodes.find((n) => n.id === target);

            if (
              processingTransaction &&
              ((source === "main-agent" && selectedAgents.includes(target)) ||
                (target === "main-agent" && selectedAgents.includes(source)))
            ) {
              // Bright link for active transactions
              return targetNode
                ? agentStyles[targetNode.type]?.glowColor || "#FFFFFF"
                : "#FFFFFF";
            }

            // Semi-transparent link for regular connections
            return "rgba(80, 80, 255, 0.2)";
          }}
          onNodeClick={onNodeClick}
          cooldownTicks={100}
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
              return 0.02; // Faster particles for active transactions
            }

            return 0.01; // Regular speed
          }}
          linkDirectionalParticleWidth={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            if (
              processingTransaction &&
              source === "main-agent" &&
              selectedAgents.includes(target)
            ) {
              return 4; // Larger particles for active transactions
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
              const targetNode = graphData.nodes.find((n) => n.id === target);
              if (targetNode) {
                return agentStyles[targetNode.type]?.glowColor || "#FFE066";
              }
              return "#FFE066"; // Default to yellow if node not found
            }

            return "#FFFFFF33"; // Semi-transparent white for regular particles
          }}
          backgroundColor="#0F172A" // Dark blue background
        />
      )}
    </div>
  );
};

export default AgentNetwork;
