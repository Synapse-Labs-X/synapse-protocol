"use client";

import React, { useRef, useEffect, useState, JSX } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  Agent,
  AgentNetwork as AgentNetworkType,
  AgentType,
} from "@/types/agent";
import { Cpu, Bot, BarChart2, Layers, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

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

  // Convert network data to format expected by ForceGraph2D
  useEffect(() => {
    const nodes: GraphNode[] = network.nodes.map((node) => ({
      ...node,
    }));

    const links: GraphLink[] = network.links.map((link) => ({
      source: typeof link.source === "string" ? link.source : link.source.id,
      target: typeof link.target === "string" ? link.target : link.target.id,
      value: link.value,
    }));

    setGraphData({ nodes, links });
  }, [network]);

  // Agent type styling
  const agentStyles: Record<AgentType, { color: string; icon: JSX.Element }> = {
    main: { color: "#FF6B6B", icon: <Cpu size={20} /> },
    text: { color: "#4ECDC4", icon: <MessageSquare size={20} /> },
    image: { color: "#1A535C", icon: <Layers size={20} /> },
    data: { color: "#FFE66D", icon: <BarChart2 size={20} /> },
    assistant: { color: "#6B48FF", icon: <Bot size={20} /> },
  };

  // Update dimensions on resize
  useEffect(() => {
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
  }, []);

  // Graph event handlers
  const handleNodeClick = (node: GraphNode) => {
    onNodeClick(node);
  };

  // Extract node id safely
  const getNodeId = (node: string | GraphNode): string => {
    return typeof node === "string" ? node : node.id;
  };

  return (
    <div id="graph-container" className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel={(node: GraphNode) =>
          `${node.name} (${formatCurrency(node.balance)})`
        }
        nodeColor={(node: GraphNode) => {
          // Highlight selected agents
          if (selectedAgents.includes(node.id)) {
            return "#ffffff"; // Bright white for selected
          }
          return agentStyles[node.type]?.color || "#999";
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
    </div>
  );
};

export default AgentNetwork;
