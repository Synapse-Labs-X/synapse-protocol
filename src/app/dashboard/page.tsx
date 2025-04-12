"use client";

import React, { useState, useEffect } from "react";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import { v4 as uuidv4 } from "uuid";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ClientSideOnly from "@/components/ClientSideOnly";
import WalletInitialization from "@/components/wallet/WalletInitialization";
import walletInitService from "@/lib/xrp/walletInitService";
import transactionService from "@/lib/xrp/transactionService";
import walletService from "@/lib/wallet/walletService";
import Image from "next/image";
import { socketManager } from "@/lib/utils/socket";

export default function DashboardPage() {
  // State management
  const [network, setNetwork] = useState<AgentNetworkType>({
    nodes: [],
    links: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(995); // Starting balance
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ type: string; message: string }>>(
    []
  );
  // Wallet initialization states
  const [initializing, setInitializing] = useState<boolean>(false);
  const [initProgress, setInitProgress] = useState<{
    initialized: string[];
    pending: string[];
    failed: string[];
    cached: string[]; // Track which wallets were loaded from cache
    progress: number;
  }>({
    initialized: [],
    pending: [],
    failed: [],
    cached: [],
    progress: 0,
  });
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Set mounted state and initialize wallet service
  useEffect(() => {
    setHasMounted(true);

    // Initialize the wallet service
    walletService.initialize().catch(console.error);
  }, []);

  // Initialize network data
  useEffect(() => {
    if (!hasMounted) return;

    // Simulate loading delay with a modern loading animation
    const loadTimer = setTimeout(async () => {
      const walletAddress = await walletService.getWalletAddress();
      const initialNodes: Agent[] = [
        {
          id: "main-agent",
          name: "Orchestrator Agent",
          type: "main",
          balance: 995,
          cost: 0,
          status: "active",
          walletAddress: walletAddress || undefined, // Convert null to undefined
        },
        {
          id: "text-gen-1",
          name: "Text Generator",
          type: "text",
          balance: 5,
          cost: 5,
          status: "active",
        },
        {
          id: "image-gen-1",
          name: "Image Creator",
          type: "image",
          balance: 0,
          cost: 10,
          status: "active",
        },
        {
          id: "data-analyzer",
          name: "Data Analyzer",
          type: "data",
          balance: 0,
          cost: 7,
          status: "active",
        },
        {
          id: "research-assistant",
          name: "Research Assistant",
          type: "assistant",
          balance: 0,
          cost: 8,
          status: "active",
        },
        {
          id: "code-generator",
          name: "Code Generator",
          type: "text",
          balance: 0,
          cost: 6,
          status: "active",
        },
        {
          id: "translator",
          name: "Language Translator",
          type: "text",
          balance: 0,
          cost: 4,
          status: "active",
        },
        {
          id: "summarizer",
          name: "Content Summarizer",
          type: "assistant",
          balance: 0,
          cost: 3,
          status: "active",
        },
      ];

      // Initial connections - primarily from main agent to others
      const initialLinks = [
        { source: "main-agent", target: "text-gen-1", value: 1 },
        { source: "main-agent", target: "image-gen-1", value: 0 },
        { source: "main-agent", target: "data-analyzer", value: 0 },
        { source: "main-agent", target: "research-assistant", value: 0 },
        { source: "main-agent", target: "code-generator", value: 0 },
        { source: "main-agent", target: "translator", value: 0 },
        { source: "main-agent", target: "summarizer", value: 0 },
        // Some agent-to-agent connections for demonstration
        { source: "text-gen-1", target: "summarizer", value: 0.5 },
        { source: "data-analyzer", target: "code-generator", value: 0.3 },
      ];

      // Initial transaction
      const initialTransaction: Transaction = {
        id: "initial-tx-001",
        from: "main-agent",
        to: "text-gen-1",
        amount: 5,
        currency: "RLUSD",
        timestamp: new Date().toISOString(),
        status: "confirmed",
        type: "payment",
        memo: "Initial balance allocation",
      };

      setNetwork({ nodes: initialNodes, links: initialLinks });
      setTransactions([initialTransaction]);

      // Create a mapping of agent IDs to names for the initialization UI
      const nameMap = initialNodes.reduce((map, agent) => {
        map[agent.id] = agent.name;
        return map;
      }, {} as Record<string, string>);
      setAgentNames(nameMap);

      // Start pre-initializing wallets
      initializeWallets(initialNodes);
    }, 1500);

    return () => clearTimeout(loadTimer);
  }, [hasMounted]);

  useEffect(() => {
    const socket = socketManager.connect();

    // Connection events
    socket.on("connect", () => {
      console.log("[WebSocket] Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected from server");
    });

    // CrewAI execution logs
    socket.on("log_update", (data) => {
      console.groupCollapsed(`[CrewAI] ${data.log_prefix}`);
      console.log("Type:", data.type);
      console.log("Run ID:", data.run_id);
      console.log("Data:", data.data);
      console.groupEnd();
    });

    // Final results
    socket.on("run_complete", (data) => {
      console.group("[CrewAI] Run Completed");
      console.log("Status:", data.status);
      console.log("Run ID:", data.run_id);
      if (data.error) {
        console.error("Error:", data.error);
      }
      console.log("Final Result:", data.final_result);
      console.groupEnd();
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("[WebSocket Error]", error);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("log_update");
      socket.off("run_complete");
      socket.off("error");
      socket.disconnect();
    };
  }, []);

  // Initialize all agent wallets on page load
  const initializeWallets = async (agents: Agent[]) => {
    setInitializing(true);
    setInitProgress({
      initialized: [],
      pending: agents.map((agent) => agent.id),
      failed: [],
      cached: [],
      progress: 0,
    });

    try {
      // Initialize wallets in batches
      const intervalId = setInterval(async () => {
        const progress = walletInitService.getInitializationProgress();
        setInitProgress(progress);

        // When all wallets are initialized or we've handled all failures, finish loading
        if (progress.pending.length === 0) {
          clearInterval(intervalId);

          // Create trustlines for agents that need them
          await walletInitService.createTrustlinesForAgents(
            progress.initialized.filter((id) => id !== "main-agent")
          );

          // Mark the initialized wallets in the transaction service
          transactionService.markWalletsAsInitialized(progress.initialized);

          setTimeout(() => {
            setInitializing(false);
            setIsLoading(false);
          }, 1000);
        }
      }, 500);

      // Start the actual wallet initialization
      walletInitService.initializeAllWallets(agents);
    } catch (error) {
      console.error("Failed to initialize wallets:", error);
      // Even on error, proceed to the dashboard but with limited functionality
      setTimeout(() => {
        setInitializing(false);
        setIsLoading(false);
      }, 1000);
    }
  };

  // Handle prompt submission
  const handleSubmit = async (promptText: string) => {
    if (!promptText.trim()) return;

    setProcessing(true);
    console.log("[Dashboard] Submitting task:", promptText);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_description: promptText }),
      });

      console.log("[Dashboard] API Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Dashboard] API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error("Failed to start task");
      }

      const { run_id } = await response.json();
      console.log("[Dashboard] Task started with Run ID:", run_id);

      const socket = socketManager.getSocket();
      socket.emit("join_room", { run_id });
      console.log("[Dashboard] Joined WebSocket room for run:", run_id);
    } catch (error) {
      console.error("[Dashboard] Submission error:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Update network data with new transactions
  const updateNetwork = (
    agentIds: string[],
    newTransactions: Transaction[]
  ) => {
    setNetwork((prevNetwork) => {
      // Update nodes with new balances
      const updatedNodes = [...prevNetwork.nodes].map((node) => {
        if (node.id === "main-agent") {
          return {
            ...node,
            balance:
              balance - newTransactions.reduce((sum, tx) => sum + tx.amount, 0),
          };
        } else if (agentIds.includes(node.id)) {
          const receivedAmount =
            newTransactions.find((tx) => tx.to === node.id)?.amount || 0;
          return {
            ...node,
            balance: node.balance + receivedAmount,
          };
        }
        return node;
      });

      // Update links with new transaction values
      const updatedLinks = [...prevNetwork.links].map((link) => {
        const source =
          typeof link.source === "object" ? link.source.id : link.source;
        const target =
          typeof link.target === "object" ? link.target.id : link.target;

        if (
          (source === "main-agent" && agentIds.includes(target)) ||
          (target === "main-agent" && agentIds.includes(source))
        ) {
          return {
            ...link,
            value: (link.value as number) + 1,
          };
        }
        return link;
      });

      return {
        nodes: updatedNodes,
        links: updatedLinks,
      };
    });
  };

  // Handler for agent selection
  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  // Close agent details panel
  const handleCloseDetails = () => {
    setSelectedAgent(null);
  };

  // Handler for transaction completion - used by StatusBarMenu
  const handleTransactionComplete = () => {
    // Refresh data after transaction
    setTransactions((prev) => [...prev]);
  };

  // Handler for balance updates from user wallet
  const handleBalanceUpdate = (amount: number) => {
    // Update main agent balance
    setBalance((prevBalance) => prevBalance + amount);

    // Update main agent in the network
    setNetwork((prevNetwork) => {
      const updatedNodes = [...prevNetwork.nodes].map((node) => {
        if (node.id === "main-agent") {
          return {
            ...node,
            balance: node.balance + amount,
          };
        }
        return node;
      });

      return {
        ...prevNetwork,
        nodes: updatedNodes,
      };
    });

    // Create a new transaction record for the top-up
    const topUpTransaction: Transaction = {
      id: `user-topup-${Date.now()}`,
      from: "user-wallet",
      to: "main-agent",
      amount: amount,
      currency: "XRP",
      timestamp: new Date().toISOString(),
      status: "confirmed",
      type: "payment",
      memo: "Top up from user wallet",
    };

    // Add the transaction to the list
    setTransactions((prev) => [topUpTransaction, ...prev].slice(0, 50));
  };

  // Show loading state while initializing
  if (!hasMounted || isLoading) {
    return (
      <div className="h-screen bg-gradient-futuristic flex flex-col items-center justify-center">
        <div className="relative">
          {/* Animated logo */}
          <div className="relative flex items-center justify-center w-20 h-20 mb-6 mx-auto">
            <div className="absolute w-full h-full rounded-full bg-blue-600/30 animate-ping"></div>
            <div className="absolute w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin"></div>
            <div className="relative text-blue-400">
              <Image
                width={28}
                height={28}
                src="/synapse-logo.png"
                alt="Logo"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 via-white to-blue-400 bg-clip-text text-transparent">
            Synapse Protocol
          </h1>
          <p className="text-gray-400 text-center max-w-xs mx-auto">
            Decentralized Payment Network for Autonomous Agents
          </p>
        </div>

        {/* Loading steps with staggered animation */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-md rounded-lg border border-gray-700/50 p-4 w-full max-w-sm">
          <div className="space-y-3">
            <div
              className="flex items-center text-green-400 animate-fadeIn"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <span className="text-sm">Initializing agent network</span>
            </div>

            <div
              className="flex items-center text-green-400 animate-fadeIn"
              style={{ animationDelay: "0.7s" }}
            >
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <span className="text-sm">Loading wallet integrations</span>
            </div>

            <div
              className="flex items-center text-white animate-fadeIn"
              style={{ animationDelay: "1.2s" }}
            >
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm">Connecting to XRP Testnet</span>
            </div>
          </div>
        </div>

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
            opacity: 0;
            animation: fadeIn 0.5s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <ClientSideOnly>
      {initializing && (
        <WalletInitialization
          initialized={initProgress.initialized}
          pending={initProgress.pending}
          failed={initProgress.failed}
          cached={initProgress.cached}
          progress={initProgress.progress}
          agentNames={agentNames}
        />
      )}
      <DashboardLayout
        network={network}
        transactions={transactions}
        balance={balance}
        selectedAgent={selectedAgent}
        selectedAgents={selectedAgents}
        processing={processing}
        onAgentSelect={handleAgentSelect}
        onCloseDetails={handleCloseDetails}
        onPromptSubmit={handleSubmit}
        onTransactionComplete={handleTransactionComplete}
        onBalanceUpdate={handleBalanceUpdate}
        walletStatus={{
          initialized: initProgress.initialized,
          pending: initProgress.pending,
          failed: initProgress.failed,
        }}
      />
    </ClientSideOnly>
  );
}
