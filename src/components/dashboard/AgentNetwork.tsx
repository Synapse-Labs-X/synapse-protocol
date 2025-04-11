"use client";

import React, { useRef, useEffect, useState, JSX } from "react";
import dynamic from "next/dynamic";
import {
  Agent,
  AgentNetwork as AgentNetworkType,
  AgentType,
} from "@/types/agent";
import { Cpu, Bot, BarChart2, Layers, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

// Import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface AgentNetworkProps {
  network: AgentNetworkType;
  onNodeClick: (agent: Agent) => void;
  selectedAgents?: string[];
  processingTransaction?: boolean;
}

// To safely handle force graph typing
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

// Extended network type for force graph
interface ForceGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const AgentNetwork: React.FC<AgentNetworkProps> = ({
  network,
  onNodeClick,
  selectedAgents = [],
  processingTransaction = false,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState<ForceGraphData>({
    nodes: [],
    links: [],
  });
  const [hasMounted, setHasMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Convert network data to format expected by ForceGraph2D
  useEffect(() => {
    if (!hasMounted) return;

    const nodes: GraphNode[] = network.nodes.map((node) => ({
      ...node,
    }));

    const links: GraphLink[] = network.links.map((link) => ({
      source: typeof link.source === "string" ? link.source : link.source.id,
      target: typeof link.target === "string" ? link.target : link.target.id,
      value: link.value,
    }));

    setGraphData({ nodes, links });
  }, [network, hasMounted]);

  // Agent type styling
  const agentStyles: Record<AgentType, { color: string; icon: JSX.Element }> = {
    main: { color: "#FF6B6B", icon: <Cpu size={20} /> },
    text: { color: "#4ECDC4", icon: <MessageSquare size={20} /> },
    image: { color: "#1A535C", icon: <Layers size={20} /> },
    data: { color: "#FFE66D", icon: <BarChart2 size={20} /> },
    assistant: { color: "#6B48FF", icon: <Bot size={20} /> },
  };

  // Update dimensions on resize - only after component has mounted
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

  // Graph event handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const handleNodeClick = (node: any, _event: MouseEvent) => {
    onNodeClick(node as GraphNode);
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

  // Show a loading placeholder if not mounted yet
  if (!hasMounted) {
    return (
      <div
        id="graph-container"
        className="w-full h-full flex items-center justify-center bg-gray-800"
      >
        <div className="text-center">
          <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="graph-container" className="w-full h-full relative">
      {hasMounted && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node) => {
            const graphNode = node as unknown as GraphNode;
            return `${graphNode.name || "Unknown"} (${formatCurrency(
              graphNode.balance || 0
            )})`;
          }}
          nodeColor={(node) => {
            // Highlight selected agents
            const graphNode = node as unknown as GraphNode;
            if (selectedAgents.includes(graphNode.id)) {
              return "#ffffff"; // Bright white for selected
            }
            return agentStyles[graphNode.type]?.color || "#999";
          }}
          nodeRelSize={8}
          linkWidth={(link) => 1 + (link.value as number) / 2}
          linkColor={() => "rgba(255, 255, 255, 0.2)"}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          linkDirectionalParticles={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            // Show particles for active transactions
            if (
              selectedAgents.length > 0 &&
              source === "main-agent" &&
              selectedAgents.includes(target) &&
              processingTransaction
            ) {
              return 6; // More particles for active transactions
            }

            return (link.value as number) > 0
              ? Math.min(link.value as number, 3)
              : 0;
          }}
          linkDirectionalParticleSpeed={0.01}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);

            if (
              selectedAgents.length > 0 &&
              source === "main-agent" &&
              selectedAgents.includes(target) &&
              processingTransaction
            ) {
              return "#FFE066"; // Bright yellow for active transactions
            }

            return "#FFFFFF33";
          }}
        />
      )}
    </div>
  );
};

export default AgentNetwork;
