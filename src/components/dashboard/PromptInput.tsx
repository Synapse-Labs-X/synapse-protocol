import React, { JSX, useState } from "react";
import {
  Send,
  Activity,
  Cpu,
  MessageSquare,
  Layers,
  BarChart2,
  Bot,
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

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;
    await onSubmit(prompt);
    setPrompt("");
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
      <div className="flex flex-col">
        <label
          htmlFor="prompt"
          className="text-sm font-medium text-gray-300 mb-2"
        >
          Task Prompt
        </label>
        <div className="relative">
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setIsExpanded(false)}
            placeholder="Enter a task for the agent network..."
            className={`bg-gray-800 border border-gray-700 rounded-lg p-3 text-white resize-none w-full transition-all duration-300 ${
              isExpanded ? "h-32" : "h-20"
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

      {/* Agent Suggestions */}
      {prompt.length > 0 && !isProcessing && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-400 mb-2">
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
        className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition ${
          isProcessing || !prompt.trim()
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isProcessing ? (
          <>
            <Activity size={18} className="animate-spin mr-2" />
            Processing Task
          </>
        ) : (
          <>
            <Send size={18} className="mr-2" />
            Submit Task
          </>
        )}
      </button>

      {/* Selected Agents Display */}
      {selectedAgents.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-300">
              Selected Agents
            </h3>
            <span className="text-sm text-gray-400">
              Total Cost: {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-800 px-3 py-1 rounded-full text-sm flex items-center"
                style={{ borderColor: getAgentColorByType(agent.type) }}
              >
                {getAgentIconByType(agent.type)}
                <span className="ml-1">{agent.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {formatCurrency(agent.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for agent styling
function getAgentColorByType(type: string): string {
  const colors: Record<string, string> = {
    main: "#FF6B6B",
    text: "#4ECDC4",
    image: "#1A535C",
    data: "#FFE66D",
    assistant: "#6B48FF",
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

export default PromptInput;
