import React, { JSX } from "react";
import {
  X,
  Cpu,
  Bot,
  BarChart2,
  Layers,
  MessageSquare,
  Zap,
  Shield,
  Clock,
  Wallet,
  Server,
  ExternalLink,
} from "lucide-react";
import { Agent, AgentType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import { formatCurrency } from "@/lib/utils/formatters";
import TransactionButton from "./TransactionButton";

interface AgentDetailsProps {
  agent: Agent;
  onClose: () => void;
  recentTransactions: Transaction[];
}

const AgentDetails: React.FC<AgentDetailsProps> = ({
  agent,
  onClose,
  recentTransactions,
}) => {
  // Get agent icon by type
  const getAgentIcon = (type: AgentType): JSX.Element => {
    switch (type) {
      case "main":
        return <Cpu size={24} />;
      case "text":
        return <MessageSquare size={24} />;
      case "image":
        return <Layers size={24} />;
      case "data":
        return <BarChart2 size={24} />;
      case "assistant":
        return <Bot size={24} />;
      default:
        return <Bot size={24} />;
    }
  };

  // Get agent color by type - updated with more vibrant colors
  const getAgentColor = (type: AgentType): string => {
    const colors: Record<AgentType, string> = {
      main: "#FF6B6B",
      text: "#4ECDC4",
      image: "#00BFFF",
      data: "#FFF35C",
      assistant: "#9D5CFF",
    };
    return colors[type] || "#999";
  };

  const agentColor = getAgentColor(agent.type);
  const agentIcon = getAgentIcon(agent.type);

  // Get mock capabilities based on agent type
  const getAgentCapabilities = (type: AgentType): string[] => {
    switch (type) {
      case "main":
        return [
          "Orchestration",
          "Task Routing",
          "Payment Management",
          "Agent Selection",
        ];
      case "text":
        return [
          "Text Generation",
          "Content Creation",
          "Summarization",
          "Translation",
        ];
      case "image":
        return [
          "Image Generation",
          "Visual Design",
          "Style Transfer",
          "Editing",
        ];
      case "data":
        return [
          "Data Analysis",
          "Visualization",
          "Pattern Recognition",
          "Reporting",
        ];
      case "assistant":
        return [
          "Question Answering",
          "Research",
          "Information Retrieval",
          "Knowledge Base",
        ];
      default:
        return ["Generic AI Capabilities"];
    }
  };

  return (
    <div className="relative overflow-hidden transition-all duration-300 transform animate-fadeIn">
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${agentColor}66, transparent 70%)`,
        }}
      ></div>

      <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden shadow-lg">
        <div
          className="flex justify-between items-center p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(to right, ${agentColor}22, ${agentColor}11)`,
          }}
        >
          {/* Animated light effect */}
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{
              background: `linear-gradient(to right, transparent, ${agentColor}, transparent)`,
              animation: "shimmer 3s infinite",
            }}
          ></div>

          <div className="flex items-center">
            <div
              className="p-3 rounded-xl mr-3 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${agentColor}33, ${agentColor}11)`,
                boxShadow: `0 0 10px ${agentColor}66`,
              }}
            >
              {React.cloneElement(agentIcon, { color: agentColor })}
            </div>
            <div>
              <h3 className="font-bold text-lg">{agent.name}</h3>
              <p className="text-sm text-gray-400 flex items-center">
                <Shield size={12} className="mr-1" />
                Type: {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
                {agent.walletAddress && (
                  <span className="ml-2 flex items-center">
                    <Wallet size={12} className="mr-1" />
                    Address:{" "}
                    {`${agent.walletAddress.substring(
                      0,
                      6
                    )}...${agent.walletAddress.substring(
                      agent.walletAddress.length - 4
                    )}`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700/60 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {/* Agent Stats - updated with glass morphism style cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-700/40 backdrop-blur-sm border border-gray-600/30 p-3 rounded-xl">
              <div className="text-sm text-gray-400 flex items-center">
                <Server size={14} className="mr-1 text-blue-400" />
                Current Balance
              </div>
              <div className="font-mono font-bold text-lg text-blue-300">
                {formatCurrency(agent.balance)}
              </div>
            </div>
            <div className="bg-gray-700/40 backdrop-blur-sm border border-gray-600/30 p-3 rounded-xl">
              <div className="text-sm text-gray-400 flex items-center">
                <Zap size={14} className="mr-1 text-yellow-400" />
                Service Cost
              </div>
              <div
                className="font-mono font-bold text-lg"
                style={{ color: agentColor }}
              >
                {formatCurrency(agent.cost)}
              </div>
            </div>
          </div>

          {/* Agent Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
              <Shield size={14} className="mr-1 text-blue-400" />
              Capabilities
            </h4>
            <div className="flex flex-wrap gap-2">
              {getAgentCapabilities(agent.type).map((capability, index) => (
                <span
                  key={index}
                  className="bg-gray-700/50 backdrop-blur-sm text-xs px-3 py-1 rounded-full border border-gray-600/30 hover:bg-gray-700/70 transition-colors"
                  style={{
                    boxShadow: `0 0 8px ${agentColor}22`,
                  }}
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>

          {/* Agent Status */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
              <Server size={14} className="mr-1 text-blue-400" />
              Status
            </h4>
            <div className="bg-gray-700/40 backdrop-blur-sm p-3 rounded-xl border border-gray-600/30 flex items-center">
              <div
                className={`h-3 w-3 rounded-full mr-2 ${
                  agent.status === "active"
                    ? "bg-green-500 animate-pulse"
                    : agent.status === "processing"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-500"
                }`}
              />
              <span className="text-sm">
                {agent.status
                  ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
                  : "Inactive"}
              </span>
              {agent.lastActive && (
                <span className="text-xs text-gray-400 ml-auto flex items-center">
                  <Clock size={12} className="mr-1" />
                  Last active: {new Date(agent.lastActive).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                <Zap size={14} className="mr-1 text-blue-400" />
                Recent Transactions
              </h4>
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-2 bg-gray-700/40 backdrop-blur-sm rounded-xl border border-gray-600/30 hover:bg-gray-700/60 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className="p-1 rounded-full flex items-center justify-center mr-2"
                        style={{
                          background: `linear-gradient(135deg, ${agentColor}33, ${agentColor}11)`,
                          boxShadow: `0 0 5px ${agentColor}44`,
                        }}
                      >
                        <Zap size={12} className="text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-xs">
                          {tx.from === agent.id ? "Sent to" : "Received from"}
                        </div>
                        <div className="text-sm font-medium">
                          {tx.from === agent.id ? tx.to : tx.from}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono text-sm ${
                        tx.from === agent.id ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {tx.from === agent.id ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Details */}
          {agent.description && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                <MessageSquare size={14} className="mr-1 text-blue-400" />
                Description
              </h4>
              <div className="bg-gray-700/40 backdrop-blur-sm p-3 rounded-xl text-sm border border-gray-600/30">
                {agent.description}
              </div>
            </div>
          )}

          {/* Agent Actions */}
          <div className="mt-4 flex space-x-2">
            <button className="bg-gray-700/60 hover:bg-gray-600/80 text-sm px-4 py-2 rounded-xl flex-1 transition-colors border border-gray-600/30 flex items-center justify-center">
              <ExternalLink size={14} className="mr-2" />
              View Details
            </button>
            {agent.type !== "main" ? (
              <button
                className="text-sm px-4 py-2 rounded-xl flex-1 transition-colors flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${agentColor}dd, ${agentColor}aa)`,
                  boxShadow: `0 0 10px ${agentColor}66`,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 15px ${agentColor}aa`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 10px ${agentColor}66`;
                }}
              >
                <Bot size={14} className="mr-2" />
                Interact
              </button>
            ) : (
              <TransactionButton
                sourceAgent={agent}
                targetAgent={{
                  id: "summarizer",
                  name: "Content Summarizer",
                  type: "assistant",
                  balance: 0,
                  cost: 3,
                  status: "active",
                }}
                className="flex-1 text-sm"
              />
            )}
          </div>

          {/* Agent Analytics Preview */}
          {agent.type === "main" && (
            <div className="mt-4 bg-gray-700/40 backdrop-blur-sm p-3 rounded-xl border border-gray-600/30 overflow-hidden relative">
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                <BarChart2 size={14} className="mr-1 text-blue-400" />
                Network Analytics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center relative z-10">
                <div className="bg-gray-800/60 backdrop-blur-sm p-2 rounded-xl border border-gray-700/30">
                  <div className="text-xl font-bold text-blue-300">
                    {recentTransactions.length}
                  </div>
                  <div className="text-xs text-gray-400">Transactions</div>
                </div>
                <div className="bg-gray-800/60 backdrop-blur-sm p-2 rounded-xl border border-gray-700/30">
                  <div
                    className="text-xl font-bold"
                    style={{ color: agentColor }}
                  >
                    {recentTransactions
                      .reduce(
                        (sum, tx) =>
                          sum + (tx.from === agent.id ? tx.amount : 0),
                        0
                      )
                      .toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Total Spent</div>
                </div>
              </div>

              {/* Analytics background effect */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-10 z-0">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                >
                  <path
                    fill="none"
                    stroke={agentColor}
                    strokeWidth="1"
                    d="M0,20 Q25,5 50,25 T100,20"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    fill="none"
                    stroke={agentColor}
                    strokeWidth="1"
                    d="M0,25 Q35,10 70,20 T100,25"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AgentDetails;
