import React, { JSX } from "react";
import {
  X,
  Cpu,
  Bot,
  BarChart2,
  Layers,
  MessageSquare,
  Zap,
} from "lucide-react";
import { Agent, AgentType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import { formatCurrency } from "@/lib/utils/formatters";

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

  // Get agent color by type
  const getAgentColor = (type: AgentType): string => {
    const colors: Record<AgentType, string> = {
      main: "#FF6B6B",
      text: "#4ECDC4",
      image: "#1A535C",
      data: "#FFE66D",
      assistant: "#6B48FF",
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
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex justify-between items-center p-4"
        style={{ backgroundColor: `${agentColor}33` }}
      >
        <div className="flex items-center">
          <div
            className="p-3 rounded-full mr-3"
            style={{ backgroundColor: `${agentColor}66` }}
          >
            {React.cloneElement(agentIcon, { color: agentColor })}
          </div>
          <div>
            <h3 className="font-bold text-lg">{agent.name}</h3>
            <p className="text-sm text-gray-400">
              Type: {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
              {agent.walletAddress && (
                <span className="ml-2">
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
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4">
        {/* Agent Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Current Balance</div>
            <div className="font-mono font-bold text-lg">
              {formatCurrency(agent.balance)}
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Service Cost</div>
            <div className="font-mono font-bold text-lg">
              {formatCurrency(agent.cost)}
            </div>
          </div>
        </div>

        {/* Agent Capabilities */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Capabilities
          </h4>
          <div className="flex flex-wrap gap-2">
            {getAgentCapabilities(agent.type).map((capability, index) => (
              <span
                key={index}
                className="bg-gray-700 text-xs px-3 py-1 rounded-full"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* Agent Status */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Status</h4>
          <div className="bg-gray-700 p-3 rounded-lg flex items-center">
            <div
              className={`h-3 w-3 rounded-full mr-2 ${
                agent.status === "active"
                  ? "bg-green-500"
                  : agent.status === "processing"
                  ? "bg-yellow-500"
                  : "bg-gray-500"
              }`}
            />
            <span className="text-sm">
              {agent.status
                ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
                : "Inactive"}
            </span>
            {agent.lastActive && (
              <span className="text-xs text-gray-400 ml-auto">
                Last active: {new Date(agent.lastActive).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">
              Recent Transactions
            </h4>
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-2 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <Zap size={14} className="text-yellow-400 mr-2" />
                    <div>
                      <div className="text-xs">
                        {tx.from === agent.id ? "Sent to" : "Received from"}
                      </div>
                      <div className="text-sm">
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
            <h4 className="text-sm font-semibold text-gray-400 mb-2">
              Description
            </h4>
            <div className="bg-gray-700 p-3 rounded-lg text-sm">
              {agent.description}
            </div>
          </div>
        )}

        {/* Agent Actions */}
        <div className="mt-4 flex space-x-2">
          <button className="bg-gray-700 hover:bg-gray-600 text-sm px-4 py-2 rounded-lg flex-1 transition-colors">
            View Details
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2 rounded-lg flex-1 transition-colors"
            style={{ backgroundColor: `${agentColor}`, opacity: 0.9 }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
          >
            Interact
          </button>
        </div>

        {/* Agent Analytics Preview */}
        {agent.type === "main" && (
          <div className="mt-4 bg-gray-700 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">
              Network Analytics
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xl font-bold">
                  {recentTransactions.length}
                </div>
                <div className="text-xs text-gray-400">Transactions</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xl font-bold">
                  {recentTransactions
                    .reduce(
                      (sum, tx) => sum + (tx.from === agent.id ? tx.amount : 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Total Spent</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDetails;
