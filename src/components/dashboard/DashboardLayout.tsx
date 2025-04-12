"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Activity,
  ExternalLink,
  Menu,
  X,
  Database,
  Shield,
  Server,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils/formatters";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import AgentNetwork from "@/components/dashboard/AgentNetwork";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import AgentDetails from "@/components/dashboard/AgentDetails";
import PromptInput from "@/components/dashboard/PromptInput";
import StatusBarMenu from "@/components/dashboard/StatusBarMenu";

interface EnhancedDashboardProps {
  network: AgentNetworkType;
  transactions: Transaction[];
  balance: number;
  selectedAgent: Agent | null;
  selectedAgents: Agent[];
  processing: boolean;
  onAgentSelect: (agent: Agent) => void;
  onCloseDetails: () => void;
  onPromptSubmit: (prompt: string) => Promise<void>;
  onTransactionComplete: () => void;
}

// Dashboard component with enhanced UI
const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  network,
  transactions,
  balance,
  selectedAgent,
  selectedAgents,
  processing,
  onAgentSelect,
  onCloseDetails,
  onPromptSubmit,
  onTransactionComplete,
}) => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showGlowEffects, setShowGlowEffects] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("network");

  // Enable glow effects after a short delay for better performance
  useEffect(() => {
    const timer = setTimeout(() => setShowGlowEffects(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const mainAgent = network.nodes.find((node) => node.id === "main-agent");

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Enhanced Header with Glassmorphism */}
      <header className="relative z-10 backdrop-blur-md bg-gray-900/80 border-b border-gray-700/50">
        {/* Background gradient decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute top-0 left-1/4 w-1/3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent ${
              showGlowEffects ? "opacity-70" : "opacity-0"
            } blur-sm transition-opacity duration-1000`}
          ></div>
          <div
            className={`absolute bottom-0 right-1/3 w-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent ${
              showGlowEffects ? "opacity-50" : "opacity-0"
            } transition-opacity duration-1000 delay-300`}
          ></div>
        </div>

        <div className="flex items-center justify-between p-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 shadow-lg">
              <Image
                width={20}
                height={20}
                alt="Synapse Logo"
                src={"/synapse-logo.png"}
              />
              {showGlowEffects && (
                <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-pulse"></div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Synapse
              </h1>
              <p className="text-xs text-gray-400">
                Decentralized Agent Payment Protocol
              </p>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="block md:hidden ml-4 p-1 rounded-lg bg-gray-800 hover:bg-gray-700"
              onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Status Info Pills */}
          <div className="hidden md:flex items-center gap-3">
            <div className="group relative px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800 hover:border-gray-600/50">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-400" />
                <div>
                  <span className="text-gray-400 text-xs">Balance</span>
                  <div className="font-mono text-sm">
                    {formatCurrency(balance)}
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800 hover:border-gray-600/50">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2">
                <Server size={16} className="text-green-400" />
                <div>
                  <span className="text-gray-400 text-xs">Network</span>
                  <div className="text-sm text-green-400 flex items-center gap-1">
                    XRP Testnet
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800 hover:border-gray-600/50">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-400" />
                <div>
                  <span className="text-gray-400 text-xs">Transactions</span>
                  <div className="text-sm">{transactions.length}</div>
                </div>
              </div>
            </div>

            {mainAgent && (
              <StatusBarMenu
                mainAgent={mainAgent}
                targetAgents={network.nodes.filter(
                  (a) => a.id !== mainAgent.id
                )}
                onTransactionComplete={onTransactionComplete}
              />
            )}
          </div>
        </div>

        {/* Mobile Status Bar - Shown only on mobile */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMobileSidebarOpen ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="p-4 space-y-3 bg-gray-800/30 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-blue-400" />
                  <div>
                    <span className="text-gray-400 text-xs">Balance</span>
                    <div className="font-mono text-sm">
                      {formatCurrency(balance)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  <div>
                    <span className="text-gray-400 text-xs">Transactions</span>
                    <div className="text-sm">{transactions.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {mainAgent && (
              <StatusBarMenu
                mainAgent={mainAgent}
                targetAgents={network.nodes.filter(
                  (a) => a.id !== mainAgent.id
                )}
                onTransactionComplete={onTransactionComplete}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content with Enhanced Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {showGlowEffects && (
            <>
              <div className="absolute top-10 left-1/4 w-40 h-40 rounded-full bg-blue-600/10 blur-3xl"></div>
              <div className="absolute bottom-10 right-1/4 w-60 h-60 rounded-full bg-indigo-700/10 blur-3xl"></div>
              <div className="absolute top-1/3 right-1/3 w-20 h-20 rounded-full bg-purple-600/10 blur-xl"></div>
            </>
          )}

          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDYwMCA2MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMzc0RCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgogICAgPC9wYXR0ZXJuPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMGYxNzJhIiBvcGFjaXR5PSIwLjgiIC8+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgb3BhY2l0eT0iMC4wNSIgLz4KPC9zdmc+')] opacity-30"></div>
        </div>

        {/* Network Graph - Enhanced container */}
        <div className="hidden md:block w-full md:w-2/3 md:border-r md:border-gray-700/50 relative bg-gradient-network overflow-hidden">
          {/* Cyberpunk grid overlay */}
          <div
            className={`absolute inset-0 z-0 cyberpunk-grid ${
              processing ? "grid-active" : ""
            } ${selectedAgent ? "grid-focused" : ""}`}
          >
            <div className="absolute inset-0 cyberpunk-grid-lines"></div>
            <div className="absolute inset-0 cyberpunk-grid-glow"></div>
            {processing && (
              <div className="absolute inset-0 cyberpunk-grid-pulse"></div>
            )}
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 z-1 pointer-events-none">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
          </div>

          <div className="absolute top-2 left-2 z-10 bg-gray-800/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700/50 flex items-center gap-1.5">
            <Activity size={14} className="text-blue-400" />
            <span>Agent Network Visualization</span>
          </div>

          <div className="h-full relative z-5">
            <AgentNetwork
              network={network}
              onNodeClick={onAgentSelect}
              selectedAgents={selectedAgents.map((agent) => agent.id)}
              processingTransaction={processing}
            />
          </div>
        </div>

        {/* Mobile content - Simple tabs for mobile view */}
        <div className="md:hidden w-full flex flex-col">
          <div className="border-b border-gray-700/50 flex items-center">
            <button
              className={`flex-1 py-2 text-center text-sm font-medium ${
                activeTab === "network"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("network")}
            >
              Network
            </button>
            <button
              className={`flex-1 py-2 text-center text-sm font-medium ${
                activeTab === "transactions"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("transactions")}
            >
              Transactions
            </button>
            <button
              className={`flex-1 py-2 text-center text-sm font-medium ${
                activeTab === "prompt"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("prompt")}
            >
              Prompt
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === "network" && (
              <div className="h-64 md:h-full">
                <AgentNetwork
                  network={network}
                  onNodeClick={onAgentSelect}
                  selectedAgents={selectedAgents.map((agent) => agent.id)}
                  processingTransaction={processing}
                />
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">Recent Transactions</h2>
                </div>
                <TransactionHistory
                  transactions={transactions}
                  agents={network.nodes}
                />
              </div>
            )}

            {activeTab === "prompt" && (
              <div className="p-4">
                <PromptInput
                  onSubmit={onPromptSubmit}
                  selectedAgents={selectedAgents}
                  isProcessing={processing}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Enhanced UI */}
        <div className="hidden md:flex md:w-1/3 flex-col bg-gray-800/20 backdrop-blur-sm">
          {/* Agent Interaction */}
          <div className="p-4 border-b border-gray-700/50 bg-gray-800/30 relative">
            {showGlowEffects && (
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70 blur-sm"></div>
            )}
            <PromptInput
              onSubmit={onPromptSubmit}
              selectedAgents={selectedAgents}
              isProcessing={processing}
            />
          </div>

          {/* Recent Transactions */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Recent Transactions
              </h2>
              <a
                href="#"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View All <ExternalLink size={12} />
              </a>
            </div>
            <TransactionHistory
              transactions={transactions}
              agents={network.nodes}
            />
          </div>

          {/* Agent Details (conditionally rendered) */}
          {selectedAgent && (
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
              <AgentDetails
                agent={selectedAgent}
                onClose={onCloseDetails}
                recentTransactions={transactions
                  .filter(
                    (tx) =>
                      tx.from === selectedAgent.id || tx.to === selectedAgent.id
                  )
                  .slice(0, 5)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden flex items-center justify-around border-t border-gray-800 bg-gray-900/80 backdrop-blur-md py-3">
        <button
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "network" ? "text-blue-400" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("network")}
        >
          <Activity size={20} />
          <span className="text-xs font-medium">Network</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "transactions" ? "text-blue-400" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("transactions")}
        >
          <Zap size={20} />
          <span className="text-xs font-medium">Transactions</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "prompt" ? "text-blue-400" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("prompt")}
        >
          <Shield size={20} />
          <span className="text-xs font-medium">Prompt</span>
        </button>
      </div>

      {/* Bottom glowing border */}
      {showGlowEffects && (
        <div className="hidden md:block h-px w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30"></div>
      )}

      {/* Add global CSS for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

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

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
};

export default EnhancedDashboard;
