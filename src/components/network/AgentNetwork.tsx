import React, { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { formatCurrency } from "@/lib/utils/formatters";
import { ForceGraphMethods } from "react-force-graph-2d";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface AgentNetworkProps {
  network: AgentNetworkType;
  onNodeClick: (agent: Agent) => void;
  selectedAgents?: string[];
  processingTransaction?: boolean;
}

interface GraphNode extends Agent {
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
  active?: boolean; // Flag for active transactions
  returnToMain?: boolean; // Flag to indicate if this link returns to the main node
  index?: number;
}

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
  const isMobile = useIsMobile();

  const zoomToFit = useCallback(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.zoomToFit(400, 60);
      setNeedsZooming(false);
    }
  }, [graphData.nodes.length]);

  useEffect(() => {
    setHasMounted(true);

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: isMobile ? 300 : rect.height || 600,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isMobile]);

  useEffect(() => {
    if (!hasMounted) return;

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 100),
          height: isMobile ? 300 : Math.max(rect.height, 100),
        });
        setNeedsZooming(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasMounted, isMobile]);

  useEffect(() => {
    if (
      !hasMounted ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      network.nodes.length === 0
    ) {
      return;
    }

    const nodes: GraphNode[] = network.nodes.map((node) => {
      // For main agent, fixed position at the center
      if (node.id === "main-agent") {
        return {
          ...node,
          fx: dimensions.width / 2, // Center horizontally
          fy: dimensions.height / 2, // Center vertically
        };
      }

      // For other nodes, pre-calculate positions in a circle around main agent
      const otherNodes = network.nodes.filter((n) => n.id !== "main-agent");
      const indexOfNode = otherNodes.findIndex((n) => n.id === node.id);

      if (indexOfNode !== -1) {
        const totalNodes = otherNodes.length;
        const angleStep = (2 * Math.PI) / totalNodes; // Full circle for even distribution
        const angle = indexOfNode * angleStep;

        // Calculate position in a circle
        const radius = Math.min(dimensions.width, dimensions.height) * 0.35; // Use 35% of smaller dimension for better layout

        const x = dimensions.width / 2 + radius * Math.cos(angle);
        const y = dimensions.height / 2 + radius * Math.sin(angle);

        return {
          ...node,
          fx: x,
          fy: y,
        };
      }

      return { ...node };
    });

    const allLinks: GraphLink[] = [];
    network.links.forEach((link) => {
      allLinks.push({
        source: typeof link.source === "string" ? link.source : link.source.id,
        target: typeof link.target === "string" ? link.target : link.target.id,
        value: link.value || 1,
        active: link.active || false,
        returnToMain: link.returnToMain || false,
      });
    });

    // Always ensure main agent is connected to all other agents
    const mainAgentId = nodes.find((n) => n.id === "main-agent")?.id;
    if (mainAgentId) {
      nodes.forEach((node) => {
        if (node.id !== mainAgentId) {
          // Check if connection already exists from main to this node
          const mainToNodeExists = allLinks.some(
            (link) =>
              getNodeId(link.source) === mainAgentId &&
              getNodeId(link.target) === node.id
          );

          // Check if connection already exists from this node back to main
          const nodeToMainExists = allLinks.some(
            (link) =>
              getNodeId(link.source) === node.id &&
              getNodeId(link.target) === mainAgentId
          );

          // Add main-to-node link if it doesn't exist
          if (!mainToNodeExists) {
            allLinks.push({
              source: mainAgentId,
              target: node.id,
              value: 0.5, // Lower value for default connections
              active: false,
            });
          }

          // Add node-to-main link if it doesn't exist (for return path)
          if (!nodeToMainExists) {
            allLinks.push({
              source: node.id,
              target: mainAgentId,
              value: 0.2, // Even lower value for return paths initially
              active: false,
              returnToMain: true, // Mark as return path to main
            });
          }
        }
      });
    }

    // Add connections between agents based on their interactions
    if (selectedAgents.length > 1) {
      // Create a chain of links between selected agents in sequence
      for (let i = 0; i < selectedAgents.length - 1; i++) {
        const source = selectedAgents[i];
        const target = selectedAgents[i + 1];

        // Skip if it's the same node
        if (source === target) continue;

        // Check if link already exists in this direction
        const linkExists = allLinks.some(
          (link) =>
            getNodeId(link.source) === source &&
            getNodeId(link.target) === target
        );

        if (!linkExists) {
          allLinks.push({
            source,
            target,
            value: 1,
            active: processingTransaction, // Active if currently processing
          });
        } else {
          // Update existing link to be active
          const linkIndex = allLinks.findIndex(
            (link) =>
              getNodeId(link.source) === source &&
              getNodeId(link.target) === target
          );
          if (linkIndex >= 0) {
            allLinks[linkIndex] = {
              ...allLinks[linkIndex],
              value: Math.max(1, (allLinks[linkIndex].value || 0) + 0.5),
              active: processingTransaction,
            };
          }
        }
      }

      // Add return link from last selected agent back to main agent
      if (selectedAgents.length > 0 && mainAgentId) {
        const lastAgent = selectedAgents[selectedAgents.length - 1];

        // Check if link already exists
        const returnLinkExists = allLinks.some(
          (link) =>
            getNodeId(link.source) === lastAgent &&
            getNodeId(link.target) === mainAgentId
        );

        if (!returnLinkExists) {
          allLinks.push({
            source: lastAgent,
            target: mainAgentId,
            value: 1,
            active: processingTransaction,
            returnToMain: true,
          });
        } else {
          // Update existing return link to be active
          const linkIndex = allLinks.findIndex(
            (link) =>
              getNodeId(link.source) === lastAgent &&
              getNodeId(link.target) === mainAgentId
          );
          if (linkIndex >= 0) {
            allLinks[linkIndex] = {
              ...allLinks[linkIndex],
              value: Math.max(1, (allLinks[linkIndex].value || 0) + 0.5),
              active: processingTransaction,
              returnToMain: true,
            };
          }
        }
      }
    }

    setGraphData({ nodes, links: allLinks });
    setNeedsZooming(true);
  }, [
    network,
    hasMounted,
    dimensions,
    isMobile,
    selectedAgents,
    processingTransaction,
  ]);

  useEffect(() => {
    if (needsZooming && hasMounted && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
        zoomToFit();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [needsZooming, hasMounted, graphData.nodes.length, zoomToFit]);

  const agentStyles = {
    main: { color: "#FF6B6B", glowColor: "#FF0045" },
    text: { color: "#4ECDC4", glowColor: "#00FFD1" },
    image: { color: "#1A535C", glowColor: "#00CCFF" },
    data: { color: "#FFE66D", glowColor: "#FFCC00" },
    assistant: { color: "#6B48FF", glowColor: "#7C4DFF" },
  };

  // Extract node id safely - improved to handle all edge cases
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
  }, [graphData.nodes.length]);

  // Check if a link is part of an active transaction
  const isLinkActive = (link: any): boolean => {
    // Directly check the active flag
    if (link.active) return true;

    // If processing transactions, check for links in the selected agent chain
    if (processingTransaction && selectedAgents.length > 1) {
      const source = getNodeId(link.source);
      const target = getNodeId(link.target);

      // Check if this link is part of the chain
      for (let i = 0; i < selectedAgents.length - 1; i++) {
        if (source === selectedAgents[i] && target === selectedAgents[i + 1]) {
          return true;
        }
      }

      // Check if this is the return link to main
      if (link.returnToMain) {
        const lastSelectedAgent = selectedAgents[selectedAgents.length - 1];
        const mainAgent = graphData.nodes.find((n) => n.id === "main-agent");

        if (source === lastSelectedAgent && target === mainAgent?.id) {
          return true;
        }
      }
    }

    return false;
  };

  // Get the flow direction for particles
  const getLinkParticleFlow = (
    link: GraphLink
  ): { count: number; speed: number } => {
    // Default values
    // const defaultFlow = { count: 0, speed: 0.002 };

    // If link is not active, base flow on link value
    if (!isLinkActive(link)) {
      const value = (link.value || 0) as number;
      return {
        count: value > 0.5 ? Math.min(Math.ceil(value), 3) : 0,
        speed: 0.002,
      };
    }

    // For active links, return high particle count and speed
    return {
      count: 6, // More particles for active links
      speed: 0.005, // Faster for active links
    };
  };

  // Custom node rendering function
  const nodeCanvasObject = (
    node: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
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
    const fontSize = isMobile ? 12 / globalScale : 14 / globalScale;
    const nodeType = graphNode.type;

    const nodeWidth =
      Math.max(label.length * (isMobile ? 6 : 8), 140) / globalScale;
    const nodeHeight = (isMobile ? 36 : 44) / globalScale;
    const cornerRadius = 6 / globalScale;

    const isSelected = selectedAgents.includes(graphNode.id);
    const isProcessing = graphNode.status === "processing";
    const baseColor = agentStyles[nodeType]?.color || "#999999";
    const glowColor = agentStyles[nodeType]?.glowColor || "#666666";

    const nodeX = graphNode.x;
    const nodeY = graphNode.y;

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isSelected || (processingTransaction && isProcessing)) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

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

    ctx.strokeStyle = isSelected ? glowColor : adjustColor(baseColor, 30);
    ctx.lineWidth = isSelected ? 2 / globalScale : 1.5 / globalScale;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.shadowBlur = 0;
    ctx.fillText(label, nodeX, nodeY - fontSize * 0.2);

    ctx.font = `${fontSize * 0.8}px Arial`;
    ctx.fillStyle = "#FFFFFF99";
    ctx.fillText(
      formatCurrency(graphNode.balance || 0),
      nodeX,
      nodeY + fontSize * 0.9
    );

    ctx.restore();
  };

  const adjustColor = (color: string, amount: number): string => {
    const clamp = (val: number) => Math.min(255, Math.max(0, val));
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const newR = clamp(r + amount);
    const newG = clamp(g + amount);
    const newB = clamp(b + amount);
    return `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  };

  // Handler for node click
  const handleNodeClick = (node: any) => {
    const graphNode = node as GraphNode;
    onNodeClick(graphNode);
  };

  // Get color for a node based on its type
  const getNodeColor = (nodeId: string): string => {
    const node = graphData.nodes.find((n) => n.id === nodeId);
    if (node && node.type) {
      return agentStyles[node.type]?.glowColor || "#FFFFFF";
    }
    return "#FFFFFF";
  };

  if (!hasMounted) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ height: isMobile ? "300px" : "100%" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ height: isMobile ? "300px" : "100%" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"></div>
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(59, 130, 246, 0.3) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 15% 40%, rgba(56, 189, 248, 0.2), transparent 45%), 
                        radial-gradient(circle at 85% 70%, rgba(99, 102, 241, 0.2), transparent 45%)`,
          }}
        ></div>
      </div>

      {hasMounted && graphData.nodes.length > 0 && (
        <div className="relative z-10">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={isMobile ? 300 : dimensions.height}
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
                Math.max(label.length * (isMobile ? 6 : 8), 140) /
                ctx.getTransform().a;
              const nodeHeight = (isMobile ? 36 : 44) / ctx.getTransform().a;
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
            // Link styling
            linkWidth={(link) => {
              const active = isLinkActive(link);

              // Thicker lines for active links
              if (active) {
                // Special styling for return links
                if ((link as GraphLink).returnToMain) {
                  return 3; // Thickest for return links
                }
                return 2.5; // Thick for active links
              }

              // Base width on value with min/max limits
              const value = (link.value || 0) as number;
              return Math.max(0.3, Math.min(value * 0.5, 1.5));
            }}
            linkColor={(link: any) => {
              const active = isLinkActive(link);

              // For active links, use more vibrant colors
              if (active) {
                const source = getNodeId(link.source);
                const target = getNodeId(link.target);

                // Special color for return links
                if (link.returnToMain) {
                  // Combine source color with main agent color
                  const sourceColor = getNodeColor(source);
                  return sourceColor;
                }

                // Use target node's color for the link
                return getNodeColor(target);
              }

              // Default color with varying opacity based on value
              const value = (link.value || 0) as number;
              const opacity = Math.max(0.2, Math.min(value * 0.5, 0.6));
              return `rgba(80, 80, 255, ${opacity})`;
            }}
            onNodeClick={handleNodeClick}
            cooldownTicks={isMobile ? 30 : 50} // Limited cooling for stability
            d3AlphaDecay={0.02} // Slower decay for more stable positioning
            d3VelocityDecay={0.2} // Lower value for smoother movement
            linkDirectionalParticles={(link: any) => {
              return getLinkParticleFlow(link).count;
            }}
            linkDirectionalParticleSpeed={(link: any) => {
              return getLinkParticleFlow(link).speed;
            }}
            linkDirectionalParticleWidth={(link: any) => {
              // Particle size based on whether link is active
              return isLinkActive(link) ? 6 : 2;
            }}
            linkDirectionalParticleColor={(link: any) => {
              if (isLinkActive(link)) {
                const source = getNodeId(link.source);
                const target = getNodeId(link.target);

                // For return links, use source color
                if (link.returnToMain) {
                  return getNodeColor(source);
                }

                // For regular links, use target color
                return getNodeColor(target);
              }

              // Default particle color for inactive links
              return "rgba(255, 255, 255, 0.4)";
            }}
            backgroundColor="rgba(15, 23, 42, 0)" // Transparent background
            linkDirectionalArrowLength={(link) => (isLinkActive(link) ? 6 : 0)} // Show arrows for active links
            linkDirectionalArrowRelPos={0.7} // Position arrows closer to target
            linkDirectionalArrowColor={(link) => {
              if (isLinkActive(link)) {
                const target = getNodeId(link.target);
                return getNodeColor(target);
              }
              return "rgba(80, 80, 255, 0.5)";
            }}
            linkCurvature={(link) => {
              // Add a slight curve to links for better visibility
              // More curve for return links to main
              return link.returnToMain ? 0.3 : 0.1;
            }}
            onEngineStop={() => {
              if (graphRef.current) {
                zoomToFit();
              }
            }}
            onNodeDragEnd={(node) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            enableNodeDrag={!isMobile}
            warmupTicks={isMobile ? 10 : 20}
          />
        </div>
      )}
    </div>
  );
};

export default AgentNetwork;
