import React, { JSX, useState } from "react";
import {
  Send,
  Activity,
  Cpu,
  MessageSquare,
  Layers,
  BarChart2,
  Bot,
  Sparkles,
  Zap,
} from "lucide-react";
import { Agent } from "@/types/agent";
import { formatCurrency } from "@/lib/utils/formatters";

interface PromptInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  selectedAgents: Agent[];
  isProcessing: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  selectedAgents,
  isProcessing,
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [animateSubmit, setAnimateSubmit] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;

    setAnimateSubmit(true);
    await onSubmit(prompt);
    setPrompt("");
    setTimeout(() => setAnimateSubmit(false), 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey === false) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const totalCost = selectedAgents.reduce((sum, agent) => sum + agent.cost, 0);

  return (
    <div className="space-y-4">
      <div className="relative flex flex-col">
        {/* Animated top glow */}
        <div
          className={`absolute -top-4 left-0 right-0 h-6 bg-gradient-to-b from-blue-500/30 to-transparent transition-opacity duration-700 ${
            isExpanded || prompt.length > 0 ? "opacity-100" : "opacity-0"
          }`}
        ></div>

        <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white">
          <Sparkles size={16} className="text-blue-400" />
          Agent Interaction
        </h3>

        <div
          className={`relative rounded-xl transition-all duration-300 ${
            isHovered ? "shadow-[0_0_15px_rgba(59,130,246,0.3)]" : ""
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setIsExpanded(false)}
            placeholder="Enter a task for the agent network..."
            className={`bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl p-4 text-white resize-none w-full transition-all duration-300 focus:border-blue-400 focus:shadow-[0_0_10px_rgba(59,130,246,0.5)] ${
              isExpanded ? "h-40" : "h-24"
            }`}
          />

          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            {prompt.length > 0 && (
              <span className="text-xs text-gray-400">
                {prompt.length} chars
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Agent Suggestions - Only show when relevant */}
      {prompt.length > 0 && !isProcessing && (
        <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 shadow-lg transform transition-all duration-300 hover:scale-[1.01]">
          <div className="text-xs font-medium text-blue-400 mb-2 flex items-center">
            <Zap size={12} className="mr-1" />
            Suggested Agents
          </div>
          <div className="text-xs text-gray-300">
            Based on your prompt, the following agents will likely be selected.
            The final selection will be determined at runtime.
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isProcessing || !prompt.trim()}
        className={`w-full py-3 rounded-xl flex items-center justify-center font-medium transition-all duration-300 ${
          isProcessing || !prompt.trim()
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : `bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ${
                animateSubmit ? "animate-pulse" : ""
              }`
        }`}
      >
        {isProcessing ? (
          <>
            <Activity size={18} className="animate-spin mr-2" />
            Processing Task
          </>
        ) : (
          <>
            <Send
              size={18}
              className={`mr-2 ${animateSubmit ? "animate-ping" : ""}`}
            />
            Submit Task
          </>
        )}
      </button>

      {/* Selected Agents Display - with floating-card design */}
      {selectedAgents.length > 0 && (
        <div className="mt-4 bg-gray-800/60 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 shadow-lg transition-all duration-500 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-300 flex items-center">
              <Activity size={14} className="mr-1" />
              Selected Agents
            </h3>
            <span className="text-sm text-gray-400 bg-gray-700/60 px-2 py-1 rounded-md">
              Total Cost: {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-700/60 backdrop-blur-sm px-3 py-1 rounded-lg text-sm flex items-center transition-all duration-300 hover:bg-gray-600/60 animate-fadeIn"
                style={{
                  borderLeft: `3px solid ${getAgentColorByType(agent.type)}`,
                  boxShadow: `0 0 8px rgba(${hexToRgb(
                    getAgentColorByType(agent.type)
                  )}, 0.3)`,
                }}
              >
                {getAgentIconByType(agent.type)}
                <span className="ml-1">{agent.name}</span>
                <span className="ml-2 text-xs bg-gray-800/80 px-1.5 py-0.5 rounded text-gray-300">
                  {formatCurrency(agent.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom floating style animation */}
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
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// Helper functions for agent styling with enhanced colors
function getAgentColorByType(type: string): string {
  const colors: Record<string, string> = {
    main: "#FF6B6B",
    text: "#4ECDC4",
    image: "#00BFFF",
    data: "#FFF35C",
    assistant: "#9D5CFF",
  };
  return colors[type] || "#999";
}

function getAgentIconByType(type: string): JSX.Element {
  switch (type) {
    case "main":
      return <Cpu size={14} className="text-red-400" />;
    case "text":
      return <MessageSquare size={14} className="text-teal-400" />;
    case "image":
      return <Layers size={14} className="text-blue-400" />;
    case "data":
      return <BarChart2 size={14} className="text-yellow-400" />;
    case "assistant":
      return <Bot size={14} className="text-purple-400" />;
    default:
      return <></>;
  }
}

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

export default PromptInput;
