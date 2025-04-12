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
      if (node.id === "main-agent") {
        return {
          ...node,
          fx: dimensions.width / 2,
          fy: dimensions.height * 0.2,
        };
      }

      const otherNodes = network.nodes.filter((n) => n.id !== "main-agent");
      const indexOfNode = otherNodes.findIndex((n) => n.id === node.id);

      if (indexOfNode !== -1) {
        const totalNodes = otherNodes.length;
        const angleStep = Math.PI / Math.max(1, totalNodes - 1);
        const angle = indexOfNode * angleStep;
        const radiusX = Math.min(dimensions.width, dimensions.height) * 0.8;
        const radiusY = Math.min(dimensions.width, dimensions.height) * 0.5;

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

    const allLinks: GraphLink[] = [];
    network.links.forEach((link) => {
      allLinks.push({
        source: typeof link.source === "string" ? link.source : link.source.id,
        target: typeof link.target === "string" ? link.target : link.target.id,
        value: link.value || 1,
      });
    });

    nodes.forEach((sourceNode) => {
      nodes.forEach((targetNode) => {
        if (sourceNode.id !== targetNode.id) {
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
              value: 0.2,
            });
          }
        }
      });
    });

    setGraphData({ nodes, links: allLinks });
    setNeedsZooming(true);
  }, [network, hasMounted, dimensions, isMobile]);

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

  const getNodeId = (
    node: string | GraphNode | number | { id?: string | number } | undefined
  ): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return node.toString();
    if (!node) return "";
    return (node.id || "").toString();
  };

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

  const handleNodeClick = (node: any) => {
    const graphNode = node as GraphNode;
    onNodeClick(graphNode);
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
            linkWidth={(link) => {
              const source = getNodeId(link.source);
              const target = getNodeId(link.target);

              if (
                processingTransaction &&
                ((source === "main-agent" && selectedAgents.includes(target)) ||
                  (target === "main-agent" && selectedAgents.includes(source)))
              ) {
                return 2;
              }

              return 0.5;
            }}
            linkColor={(link) => {
              const source = getNodeId(link.source);
              const target = getNodeId(link.target);
              const targetNode = graphData.nodes.find(
                (n) => n.id === target
              ) as GraphNode;

              if (
                processingTransaction &&
                ((source === "main-agent" && selectedAgents.includes(target)) ||
                  (target === "main-agent" && selectedAgents.includes(source)))
              ) {
                return targetNode && targetNode.type
                  ? agentStyles[targetNode.type]?.glowColor || "#FFFFFF"
                  : "#FFFFFF";
              }

              return "rgba(80, 80, 255, 0.8)";
            }}
            onNodeClick={handleNodeClick}
            cooldownTicks={isMobile ? 30 : 50}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.2}
            linkDirectionalParticles={(link) => {
              const source = getNodeId(link.source);
              const target = getNodeId(link.target);
              const value = link.value as number;

              if (
                processingTransaction &&
                source === "main-agent" &&
                selectedAgents.includes(target)
              ) {
                return isMobile ? 3 : 6;
              }

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
                return 0.005;
              }

              return 0.002;
            }}
            linkDirectionalParticleWidth={(link) => {
              const source = getNodeId(link.source);
              const target = getNodeId(link.target);

              if (
                processingTransaction &&
                source === "main-agent" &&
                selectedAgents.includes(target)
              ) {
                return isMobile ? 4 : 8;
              }

              return 2;
            }}
            linkDirectionalParticleColor={(link) => {
              const source = getNodeId(link.source);
              const target = getNodeId(link.target);

              if (
                processingTransaction &&
                source === "main-agent" &&
                selectedAgents.includes(target)
              ) {
                const targetNode = graphData.nodes.find(
                  (n) => n.id === target
                ) as GraphNode;
                if (targetNode && targetNode.type) {
                  return agentStyles[targetNode.type]?.glowColor || "#FFE066";
                }
                return "#FFE066";
              }

              return "#FFFFFF33";
            }}
            backgroundColor="rgba(15, 23, 42, 0)"
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
