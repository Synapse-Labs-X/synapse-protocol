"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Settings,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  RefreshCw,
  Zap,
  CheckCircle,
} from "lucide-react";
import { Agent } from "@/types/agent";
import TransactionButton from "@/components/transactions/TransactionButton";
import transactionService from "@/lib/xrp/transactionService";

interface StatusBarMenuProps {
  mainAgent: Agent;
  targetAgents: Agent[];
  onTransactionComplete?: () => void;
}

interface TrustlineStatus {
  agent: string;
  status: "pending" | "success" | "error";
  message?: string;
}

const StatusBarMenu: React.FC<StatusBarMenuProps> = ({
  mainAgent,
  targetAgents,
  onTransactionComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showTrustlineMenu, setShowTrustlineMenu] = useState(false);
  const [trustlineStatus, setTrustlineStatus] =
    useState<TrustlineStatus | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track if we're processing a trustline creation
  const [processingTrustline, setProcessingTrustline] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowTrustlineMenu(false);
  };

  const handleCreateTrustline = async (agent: Agent) => {
    setProcessingTrustline(true);
    setTrustlineStatus({
      agent: agent.id,
      status: "pending",
    });

    try {
      const success = await transactionService.createTrustline(agent.id);

      if (success) {
        setTrustlineStatus({
          agent: agent.id,
          status: "success",
          message: `Trustline established for ${agent.name}`,
        });
      } else {
        setTrustlineStatus({
          agent: agent.id,
          status: "error",
          message: `Failed to create trustline for ${agent.name}`,
        });
      }
    } catch (error) {
      setTrustlineStatus({
        agent: agent.id,
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setProcessingTrustline(false);
    }
  };

  const handleTransactionSuccess = () => {
    setIsOpen(false);
    if (onTransactionComplete) {
      onTransactionComplete();
    }
  };

  const handleBackToMenu = () => {
    setSelectedAgent(null);
    setShowTrustlineMenu(false);
    setTrustlineStatus(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center h-full bg-blue-600/80 hover:bg-blue-700/90 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/30 backdrop-blur-sm text-white"
      >
        <Settings size={14} className="mr-2" />
        <span className="text-sm">Actions</span>
        <ChevronDown
          size={14}
          className={`ml-2 transform transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800/95 backdrop-blur-md rounded-lg shadow-lg z-10 border border-gray-700/70 overflow-hidden">
          {/* Menu Header */}
          <div className="p-3 border-b border-gray-700/70 bg-gray-800/90">
            <h3 className="font-medium text-white">Network Actions</h3>
            <p className="text-xs text-gray-400">
              Manage transactions and trustlines
            </p>
          </div>

          {/* Menu Contents */}
          {showTrustlineMenu ? (
            // Trustline Menu
            <>
              <div className="p-3 border-b border-gray-700/70 bg-gray-800/80">
                <button
                  onClick={handleBackToMenu}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <ChevronDown className="rotate-90 mr-1" size={14} />
                  Back to main menu
                </button>
                <h3 className="font-medium mt-2 text-white">
                  Create Trustlines
                </h3>
                <p className="text-xs text-gray-400">
                  Establish RLUSD trustlines for agents
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-gray-700/50">
                {targetAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {agent.type}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateTrustline(agent)}
                        disabled={processingTrustline}
                        className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1
                          ${
                            trustlineStatus?.agent === agent.id &&
                            trustlineStatus.status === "success"
                              ? "bg-green-600/40 hover:bg-green-600/60 text-green-300"
                              : trustlineStatus?.agent === agent.id &&
                                trustlineStatus.status === "error"
                              ? "bg-red-600/40 hover:bg-red-600/60 text-red-300"
                              : "bg-blue-600/60 hover:bg-blue-700 text-white"
                          }
                          ${
                            processingTrustline
                              ? "opacity-70 cursor-not-allowed"
                              : ""
                          }
                        `}
                      >
                        {trustlineStatus?.agent === agent.id ? (
                          trustlineStatus.status === "pending" ? (
                            <span className="flex items-center">
                              <RefreshCw
                                size={12}
                                className="animate-spin mr-1"
                              />
                              Processing
                            </span>
                          ) : trustlineStatus.status === "success" ? (
                            <span className="flex items-center">
                              <CheckCircle size={12} className="mr-1" />
                              Trusted
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              Retry
                            </span>
                          )
                        ) : (
                          <span className="flex items-center">
                            <ShieldCheck size={12} className="mr-1" />
                            Trust
                          </span>
                        )}
                      </button>
                    </div>

                    {trustlineStatus?.agent === agent.id &&
                      trustlineStatus.message && (
                        <div
                          className={`mt-2 text-xs p-2 rounded ${
                            trustlineStatus.status === "success"
                              ? "bg-green-900/30 text-green-400 border border-green-800/30"
                              : "bg-red-900/30 text-red-400 border border-red-800/30"
                          }`}
                        >
                          {trustlineStatus.message}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </>
          ) : selectedAgent ? (
            // Agent Transaction Menu
            <>
              <div className="p-3 border-b border-gray-700/70 bg-gray-800/80">
                <button
                  onClick={handleBackToMenu}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <ChevronDown className="rotate-90 mr-1" size={14} />
                  Back to agent list
                </button>
                <h3 className="font-medium mt-2 text-white">
                  {selectedAgent.name}
                </h3>
                <p className="text-xs text-gray-400 capitalize">
                  {selectedAgent.type} Agent
                </p>
              </div>

              <div className="p-3">
                <div className="mb-3 p-2 rounded-lg bg-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-7 h-7 rounded-full bg-gray-600/50 flex items-center justify-center mr-2">
                      <Wallet size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Balance</span>
                      <div className="text-sm font-medium">
                        {selectedAgent.balance.toFixed(2)} RLUSD
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Cost</span>
                    <div className="text-sm font-medium flex items-center">
                      <Zap size={12} className="text-yellow-400 mr-1" />
                      {selectedAgent.cost.toFixed(2)} RLUSD
                    </div>
                  </div>
                </div>

                <TransactionButton
                  sourceAgent={mainAgent}
                  targetAgent={selectedAgent}
                  onTransactionComplete={handleTransactionSuccess}
                  className="w-full"
                />

                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <a
                    href="https://testnet.xrpl.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center"
                  >
                    <span>View on XRP Testnet Explorer</span>
                    <ArrowUpRight size={14} className="ml-1" />
                  </a>
                </div>
              </div>
            </>
          ) : (
            // Main Menu
            <>
              <div
                className="p-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/70 cursor-pointer"
                onClick={() => setShowTrustlineMenu(true)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center mr-3">
                    <ShieldCheck size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Create Trustlines</p>
                    <p className="text-xs text-gray-400">
                      Establish RLUSD trustlines for agents
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <div className="px-3 py-2">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Available Agents
                  </h4>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-700/40">
                  {targetAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="px-3 py-2 hover:bg-gray-700/50 transition-colors cursor-pointer flex justify-between items-center"
                      onClick={() => handleAgentSelect(agent)}
                    >
                      <div className="flex items-center">
                        <div className="mr-2 flex-shrink-0">
                          {agent.type === "text" && (
                            <MessageSquareIcon className="text-teal-400" />
                          )}
                          {agent.type === "image" && (
                            <LayersIcon className="text-blue-400" />
                          )}
                          {agent.type === "data" && (
                            <BarChartIcon className="text-yellow-400" />
                          )}
                          {agent.type === "assistant" && (
                            <BotIcon className="text-purple-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-gray-400">
                            {agent.cost.toFixed(2)} RLUSD
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="-rotate-90" size={14} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Custom agent type icon components
const MessageSquareIcon = ({ className = "" }) => (
  <div
    className={`w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center ${className}`}
  >
    <span className="text-teal-400">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </span>
  </div>
);

const LayersIcon = ({ className = "" }) => (
  <div
    className={`w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center ${className}`}
  >
    <span className="text-blue-400">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </span>
  </div>
);

const BarChartIcon = ({ className = "" }) => (
  <div
    className={`w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center ${className}`}
  >
    <span className="text-yellow-400">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    </span>
  </div>
);

const BotIcon = ({ className = "" }) => (
  <div
    className={`w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center ${className}`}
  >
    <span className="text-purple-400">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="10" rx="2"></rect>
        <circle cx="12" cy="5" r="2"></circle>
        <path d="M12 7v4"></path>
        <line x1="8" y1="16" x2="8" y2="16"></line>
        <line x1="16" y1="16" x2="16" y2="16"></line>
      </svg>
    </span>
  </div>
);

export default StatusBarMenu;
