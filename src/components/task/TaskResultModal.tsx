import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  MessageSquare,
  FileText,
  Copy,
  Check,
  Cpu,
  DownloadCloud,
  Zap,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
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
  const [exitAnimation, setExitAnimation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealContent, setRevealContent] = useState(false);
  const [animatedAgents, setAnimatedAgents] = useState<string[]>([]);

  // Handle close with exit animation
  const handleClose = () => {
    setExitAnimation(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Copy result to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Animate the agent list one by one with a staggered delay
  useEffect(() => {
    if (!isOpen) return;

    setAnimatedAgents([]);
    setRevealContent(false);

    // Start showing agents one by one
    let timer: NodeJS.Timeout;
    usedAgents.forEach((agent, index) => {
      timer = setTimeout(() => {
        setAnimatedAgents((prev) => [...prev, agent]);
      }, 150 * (index + 1));
    });

    // Reveal the main content after agents are shown
    timer = setTimeout(() => {
      setRevealContent(true);
    }, 150 * usedAgents.length + 300);

    // Prevent body scrolling when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, usedAgents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Enhanced animated backdrop */}
      <div
        className={`fixed inset-0 transition-all duration-300 ${
          exitAnimation ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-lg"></div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* Decorative glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Main modal container with animations - Full screen version */}
      <div
        className={`relative w-full h-full md:h-[95vh] md:w-[95vw] mx-auto overflow-hidden transition-all duration-300 ${
          exitAnimation ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Decorative glow effect around the container */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20 rounded-lg opacity-70 blur-xl"></div>

        {/* Modal content container */}
        <div className="bg-gray-800/90 backdrop-blur-xl rounded-lg border border-gray-700/70 shadow-2xl flex flex-col relative h-full overflow-hidden">
          {/* Animated particle effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
          </div>

          {/* Top accent line with gradient and animation */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-indigo-500"></div>

          {/* Header section - Fixed at the top */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700/70 bg-gray-800/80 relative z-10 sticky top-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Task Completed
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50 group"
                title="Close"
              >
                <X size={20} className="relative z-10" />
              </button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
            {/* Original Prompt Section */}
            <div
              className={`mb-6 transition-all duration-500 ${
                exitAnimation
                  ? "opacity-0 translate-y-4"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-400" />
                <div className="text-sm text-gray-300 font-medium">
                  Original Request
                </div>
              </div>
              <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700/70 backdrop-blur-sm">
                <div className="relative">
                  <div className="absolute left-0 top-0 w-1 h-full bg-blue-500/50 rounded-full"></div>
                  <p className="pl-3 text-gray-300">{promptText}</p>
                </div>
              </div>
            </div>

            {/* Used Agents with staggered animation */}
            {usedAgents.length > 0 && (
              <div
                className={`mb-6 transition-all duration-500 ${
                  exitAnimation
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
                style={{ transitionDelay: "100ms" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={16} className="text-purple-400" />
                  <div className="text-sm text-gray-300 font-medium">
                    Agents Used
                  </div>
                </div>
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700/70 backdrop-blur-sm">
                  <div className="flex flex-wrap gap-2">
                    {usedAgents.map((agent, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/40 text-purple-300 border border-purple-700/40 transition-all duration-300 ${
                          animatedAgents.includes(agent)
                            ? "opacity-100 transform-none"
                            : "opacity-0 -translate-y-2"
                        }`}
                      >
                        <Sparkles size={12} className="mr-1 text-purple-300" />
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cost display if available */}
            {totalCost > 0 && (
              <div
                className={`mb-6 transition-all duration-500 ${
                  exitAnimation
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
                style={{ transitionDelay: "150ms" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-yellow-400" />
                  <div className="text-sm text-gray-300 font-medium">
                    Processing Cost
                  </div>
                </div>
                <div className="bg-gray-900/40 px-4 py-3 rounded-lg border border-gray-700/70 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total processing cost</span>
                    <span className="text-yellow-300 font-mono font-medium">
                      {totalCost.toFixed(2)} RLUSD
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Result Section with reveal animation */}
            <div
              className={`transition-all duration-700 ${
                exitAnimation
                  ? "opacity-0 translate-y-4"
                  : "opacity-100 translate-y-0"
              } ${revealContent ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: "200ms" }}
            >
              <div className="flex items-center justify-between mb-2 sticky top-0 z-20 bg-gray-800/90 py-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-green-400" />
                  <div className="text-sm text-gray-300 font-medium">
                    Result
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs bg-gray-700/70 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600/50 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-green-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "task-result.md";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 text-xs bg-gray-700/70 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600/50 transition-colors"
                    title="Download as markdown"
                  >
                    <DownloadCloud size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Content container - Takes up remaining space */}
              <div className="bg-gray-900/70 rounded-lg border border-gray-700/70 shadow-inner min-h-[200px] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
                  <ReactMarkdown
                    className="prose prose-invert max-w-none prose-headings:text-blue-300 prose-a:text-blue-400 prose-pre:bg-gray-900/80 prose-pre:border prose-pre:border-gray-700/50"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      code({ node, className, children, style, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                          <SyntaxHighlighter
                            language={match[1]}
                            style={oneDark}
                            PreTag="div"
                            className="rounded-md border border-gray-700/50 !bg-gray-900/70 !shadow-inner"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            className="bg-gray-800/80 px-1.5 py-0.5 rounded text-blue-200 font-mono text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-6 mb-4 text-blue-300 border-b border-blue-900/30 pb-1">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold mt-5 mb-3 text-blue-300">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-md font-bold mt-4 mb-2 text-blue-300">
                          {children}
                        </h3>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="text-blue-400 hover:text-blue-300 underline transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-3 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-3 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-300">{children}</li>
                      ),
                      p: ({ children }) => (
                        <p className="my-3 text-gray-300 leading-relaxed">
                          {children}
                        </p>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-700/50 pl-4 py-1 my-3 text-gray-400 bg-blue-900/10 rounded-r-md">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full divide-y divide-gray-700 border border-gray-700/50 rounded-md">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-800/50">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-700/50">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2 text-sm text-gray-300 border-t border-gray-700/30">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {result}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at the bottom */}
          <div className="p-4 border-t border-gray-700/50 bg-gray-800/80 relative z-10">
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative overflow-hidden group shadow-md hover:shadow-lg"
              >
                <span className="relative z-10">Close</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/40 to-blue-600/0 animate-shimmer"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom keyframe animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          pointer-events: none;
        }

        .particle-1 {
          top: 20%;
          left: 10%;
          background: rgba(37, 99, 235, 0.5);
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.7);
          animation: float 8s infinite ease-in-out;
        }

        .particle-2 {
          top: 70%;
          left: 20%;
          background: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.7);
          animation: float 12s infinite ease-in-out;
        }

        .particle-3 {
          top: 40%;
          right: 10%;
          background: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.7);
          animation: float 10s infinite ease-in-out;
        }

        .particle-4 {
          bottom: 30%;
          right: 20%;
          background: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.7);
          animation: float 9s infinite ease-in-out;
        }

        .particle-5 {
          bottom: 10%;
          left: 40%;
          background: rgba(124, 58, 237, 0.5);
          box-shadow: 0 0 10px rgba(124, 58, 237, 0.7);
          animation: float 11s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default TaskResultModal;
