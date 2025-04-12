// src/components/task/TaskResultModal.tsx
import React from "react";
import { X, CheckCircle, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface TaskResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string;
  promptText?: string;
  usedAgents?: string[];
  totalCost?: number;
}

const TaskResultModal: React.FC<TaskResultModalProps> = ({
  isOpen,
  onClose,
  result,
  promptText = "",
  usedAgents = [],
  totalCost = 0,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative z-10 bg-gray-800 rounded-lg w-full max-w-3xl mx-4 shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-green-400" />
            Task Completed
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Task Info */}
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-1">Task</div>
            <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700/50">
              {promptText}
            </div>
          </div>

          {/* Used Agents */}
          {usedAgents.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-1">Agents Used</div>
              <div className="flex flex-wrap gap-2">
                {usedAgents.map((agent, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/30"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-1 flex items-center">
              <MessageSquare size={14} className="mr-1" />
              Result
            </div>
            <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700/50 max-h-96 overflow-y-auto">
              <ReactMarkdown
                className="prose prose-invert max-w-none"
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, inline, className, children, style, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        language={match[1]}
                        style={oneDark}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-gray-700 px-1 py-0.5 rounded"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          </div>

          {/* Cost Information */}
          <div className="mt-6 text-sm text-right text-gray-400">
            Total Cost: {totalCost.toFixed(2)} RLUSD
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskResultModal;
