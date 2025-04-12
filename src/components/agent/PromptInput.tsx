import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Activity,
  MessageSquare,
  Layers,
  BarChart2,
  Bot,
  Sparkles,
  Zap,
  CheckCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Agent, AgentType } from "@/types/agent";
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
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [animateSubmit, setAnimateSubmit] = useState<boolean>(false);
  const [showAgentSelector, setShowAgentSelector] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to properly calculate the new height
      textareaRef.current.style.height = "auto";

      // Set the height to scrollHeight to ensure all content is visible
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
    }
  }, [prompt, isExpanded]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;

    // Scroll textarea back to top
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }

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

  // Generate a suggested prompt example
  const getRandomPromptExample = () => {
    const examples = [
      "Generate a comparison of machine learning models for financial prediction",
      "Create a visual diagram showing relationships between AI agents",
      "Translate this document into Spanish and summarize key points",
      "Analyze this dataset and identify patterns in customer behavior",
      "Write code to implement a basic neural network for image recognition",
    ];
    return examples[Math.floor(Math.random() * examples.length)];
  };

  // Use example prompt
  const handleUseExample = () => {
    setPrompt(getRandomPromptExample());
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative flex flex-col">
        {/* Enhanced animated top glow */}
        <div
          className={`absolute -top-4 left-0 right-0 h-8 pointer-events-none transition-opacity duration-700 ${
            isExpanded || prompt.length > 0 || isFocused
              ? "opacity-70"
              : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 80%)",
          }}
        ></div>

        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
          <Sparkles size={16} className="text-blue-400" />
          <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            Agent Interaction
          </span>
        </h3>

        <div
          className={`relative rounded-xl transition-all duration-300 ${
            isHovered || isFocused
              ? "shadow-[0_0_20px_rgba(59,130,246,0.35)]"
              : ""
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`relative bg-gray-800/70 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-300 ${
              isFocused
                ? "border-blue-500/70"
                : isHovered
                ? "border-blue-500/40"
                : "border-gray-700/50"
            }`}
          >
            {/* Enhanced text area with subtle inner glow effect */}
            <div className="relative">
              {/* Inner glow container */}
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-t-xl ${
                  isFocused
                    ? "opacity-30"
                    : isHovered
                    ? "opacity-15"
                    : "opacity-0"
                }`}
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(59, 130, 246, 0.5) 0%, transparent 70%)",
                }}
              ></div>

              <textarea
                ref={textareaRef}
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsExpanded(true);
                  setIsFocused(true);
                }}
                onBlur={() => {
                  setIsExpanded(false);
                  setIsFocused(false);
                }}
                placeholder="Enter a task for the agent network..."
                className={`bg-transparent px-4 pt-4 pb-12 text-white w-full transition-all duration-300 min-h-[120px] resize-none focus:outline-none z-10 relative`}
                style={{
                  minHeight: isExpanded ? "180px" : "120px",
                  maxHeight: "300px", // Set max height for better mobile experience
                }}
              />
            </div>

            {/* Bottom actions panel */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Character count */}
                <div
                  className={`text-xs ${
                    prompt.length > 0 ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {prompt.length} chars
                </div>

                {/* Use example button */}
                <button
                  type="button"
                  onClick={handleUseExample}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Use example
                </button>
              </div>

              {/* Agent selector toggle (when not processing) */}
              {!isProcessing && (
                <button
                  type="button"
                  onClick={() => setShowAgentSelector(!showAgentSelector)}
                  className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {showAgentSelector ? (
                    <>
                      <span>Hide agents</span>
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>Show agents</span>
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit button with dynamic animations */}
      <button
        onClick={handleSubmit}
        disabled={isProcessing || !prompt.trim()}
        className={`relative w-full py-3 rounded-xl flex items-center justify-center font-medium transition-all duration-300 overflow-hidden ${
          isProcessing || !prompt.trim()
            ? "bg-gray-800/70 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
        }`}
      >
        {/* Button background animation */}
        {!isProcessing && prompt.trim() && (
          <div className="absolute inset-0 w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-400/40 to-blue-600/0 animate-shimmer"></div>
          </div>
        )}

        {isProcessing ? (
          <>
            <Activity size={18} className="animate-spin mr-2" />
            <span>Processing Task</span>
            <span className="ml-1 inline-flex">
              <span className="animate-pulse delay-0">.</span>
              <span className="animate-pulse delay-150">.</span>
              <span className="animate-pulse delay-300">.</span>
            </span>
          </>
        ) : (
          <>
            <Send
              size={18}
              className={`mr-2 ${animateSubmit ? "animate-ping" : ""}`}
            />
            <span className="relative">Submit Task</span>
          </>
        )}
      </button>

      {/* Agent Selection Animation */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          showAgentSelector ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
              <Bot size={14} className="text-blue-400" />
              <span>Available Agents</span>
            </h4>
            <span className="text-xs text-gray-500">
              Select agents for your task
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: "text-gen-1",
                name: "Text Generator",
                type: "text",
                cost: 5,
                selected: true,
              },
              {
                id: "image-gen-1",
                name: "Image Creator",
                type: "image",
                cost: 10,
                selected: false,
              },
              {
                id: "data-analyzer",
                name: "Data Analyzer",
                type: "data",
                cost: 7,
                selected: false,
              },
              {
                id: "research-assistant",
                name: "Research Assistant",
                type: "assistant",
                cost: 8,
                selected: false,
              },
            ].map((agent) => (
              <div
                key={agent.id}
                className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                  agent.selected
                    ? "bg-blue-900/20 border-blue-500/50"
                    : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAgentIconByType(agent.type as AgentType)}
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <div className="text-xs">
                    {agent.selected ? (
                      <span className="flex items-center text-blue-400">
                        <CheckCircle size={12} className="mr-1" />
                        Selected
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        {formatCurrency(agent.cost)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-center text-gray-500">
            Agents will be automatically selected based on your task
            requirements
          </div>
        </div>
      </div>

      {/* Selected Agents Display - with floating-card design */}
      {selectedAgents.length > 0 && (
        <div className="mt-4 bg-gray-800/60 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 shadow-lg transition-all duration-500 animate-fadeIn overflow-x-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-300 flex items-center">
              <Activity size={14} className="mr-1" />
              Selected Agents
            </h3>
            <span className="text-sm bg-gray-900/60 px-2 py-1 rounded-md border border-gray-700/50">
              Total Cost: {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-700/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm flex items-center transition-all duration-300 hover:bg-gray-600/60 animate-fadeIn group"
                style={{
                  borderLeft: `3px solid ${getAgentColorByType(agent.type)}`,
                  boxShadow: `0 0 8px rgba(${hexToRgb(
                    getAgentColorByType(agent.type)
                  )}, 0.3)`,
                }}
              >
                {getAgentIconByType(agent.type)}
                <span className="ml-1.5">{agent.name}</span>
                <span className="ml-2 text-xs bg-gray-800/80 px-1.5 py-0.5 rounded text-gray-300">
                  {formatCurrency(agent.cost)}
                </span>

                {/* Subtle pulse animation on hover */}
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    boxShadow: `0 0 10px rgba(${hexToRgb(
                      getAgentColorByType(agent.type)
                    )}, 0.5)`,
                    animation: "pulse 2s infinite",
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom animations */}
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

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .delay-0 {
          animation-delay: 0ms;
        }

        .delay-150 {
          animation-delay: 150ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
};

// Helper functions for agent styling with  colors
function getAgentColorByType(type: AgentType): string {
  const colors: Record<AgentType, string> = {
    main: "#FF6B6B",
    text: "#4ECDC4",
    image: "#00BFFF",
    data: "#FFF35C",
    assistant: "#9D5CFF",
  };
  return colors[type] || "#999";
}

function getAgentIconByType(type: AgentType): React.ReactNode {
  switch (type) {
    case "main":
      return (
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
          <Zap size={12} className="text-red-400" />
        </div>
      );
    case "text":
      return (
        <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
          <MessageSquare size={12} className="text-teal-400" />
        </div>
      );
    case "image":
      return (
        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Layers size={12} className="text-blue-400" />
        </div>
      );
    case "data":
      return (
        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <BarChart2 size={12} className="text-yellow-400" />
        </div>
      );
    case "assistant":
      return (
        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot size={12} className="text-purple-400" />
        </div>
      );
    default:
      return null;
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
