"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Settings,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Agent } from "@/types/agent";
import TransactionButton from "./TransactionButton";
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowTrustlineMenu(false);
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
    }
  };

  const handleTransactionSuccess = () => {
    setIsOpen(false);
    if (onTransactionComplete) {
      onTransactionComplete();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
      >
        <Settings size={18} className="mr-2" />
        <span>Actions</span>
        <ChevronDown
          size={16}
          className={`ml-2 transform transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg z-10">
          {/* Menu Header */}
          <div className="p-3 border-b border-gray-700">
            <h3 className="font-medium">Network Actions</h3>
            <p className="text-xs text-gray-400">
              Manage transactions and trustlines
            </p>
          </div>

          {/* Menu Contents */}
          {showTrustlineMenu ? (
            // Trustline Menu
            <>
              <div className="p-3 border-b border-gray-700">
                <button
                  onClick={() => setShowTrustlineMenu(false)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <ChevronDown className="rotate-90 mr-1" size={14} />
                  Back to main menu
                </button>
                <h3 className="font-medium mt-2">Create Trustlines</h3>
                <p className="text-xs text-gray-400">
                  Establish RLUSD trustlines for agents
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {targetAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.type}</p>
                      </div>
                      <button
                        onClick={() => handleCreateTrustline(agent)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                        disabled={
                          trustlineStatus?.agent === agent.id &&
                          trustlineStatus.status === "pending"
                        }
                      >
                        {trustlineStatus?.agent === agent.id ? (
                          trustlineStatus.status === "pending" ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-1 h-3 w-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Processing
                            </span>
                          ) : trustlineStatus.status === "success" ? (
                            <span className="flex items-center">
                              <ShieldCheck size={12} className="mr-1" />
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
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
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
              <div className="p-3 border-b border-gray-700">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <ChevronDown className="rotate-90 mr-1" size={14} />
                  Back to agent list
                </button>
                <h3 className="font-medium mt-2">{selectedAgent.name}</h3>
                <p className="text-xs text-gray-400">{selectedAgent.type}</p>
              </div>

              <div className="p-3">
                <TransactionButton
                  sourceAgent={mainAgent}
                  targetAgent={selectedAgent}
                  onTransactionComplete={handleTransactionSuccess}
                  className="w-full"
                />

                <div className="mt-3 pt-3 border-t border-gray-700">
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
                className="p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 cursor-pointer"
                onClick={() => setShowTrustlineMenu(true)}
              >
                <div className="flex items-center">
                  <ShieldCheck size={18} className="text-blue-400 mr-2" />
                  <div>
                    <p className="font-medium">Create Trustlines</p>
                    <p className="text-xs text-gray-400">
                      Establish RLUSD trustlines
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {targetAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 cursor-pointer"
                    onClick={() => handleAgentSelect(agent)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.type}</p>
                      </div>
                      <ChevronDown className="-rotate-90" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusBarMenu;
