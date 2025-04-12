/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ClientSideOnly from "@/components/ClientSideOnly";
import WalletInitialization from "@/components/wallet/WalletInitialization";
import walletInitService from "@/lib/xrp/walletInitService";
import transactionService from "@/lib/xrp/transactionService";
import walletService from "@/lib/wallet/walletService";
import { analyzePrompt } from "@/lib/agents/analysis";
import Image from "next/image";
import { socketManager } from "@/lib/utils/socket";
import TaskResultModal from "@/components/task/TaskResultModal";
import {
  waitForRunCompletion,
  extractAgentInfo,
} from "@/lib/utils/crewAISocket";

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

  // Task result state
  const [showTaskResult, setShowTaskResult] = useState<boolean>(false);
  const [taskResult, setTaskResult] = useState<string>("");
  const [taskPrompt, setTaskPrompt] = useState<string>("");
  const [taskAgents, setTaskAgents] = useState<string[]>([]);
  const [taskCost, setTaskCost] = useState<number>(0);

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

  // Set up socket listeners for CrewAI communication
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
    socket.on(
      "log_update",
      (data: { log_prefix: any; type: any; run_id: any; data: any }) => {
        console.groupCollapsed(`[CrewAI] ${data.log_prefix}`);
        console.log("Type:", data.type);
        console.log("Run ID:", data.run_id);
        console.log("Data:", data.data);
        console.groupEnd();
      }
    );

    // Error handling
    socket.on("error", (error: any) => {
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
      // First, update the UI to show the agents are processing
      const agentsToUse = await analyzePromptAndSelectAgents(promptText);

      // Set selected agents for visualization
      setSelectedAgents(agentsToUse);

      // Store the prompt for the result modal
      setTaskPrompt(promptText);

      // Update network state to show processing status
      setNetwork((prevNetwork) => {
        const updatedNodes = prevNetwork.nodes.map((node) => {
          if (agentsToUse.some((agent) => agent.id === node.id)) {
            return { ...node, status: "processing" };
          }
          return node;
        });
        return { ...prevNetwork, nodes: updatedNodes };
      });

      // Start CrewAI task
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

      // Wait for the run to complete using our helper
      const result = await waitForRunCompletion(run_id);
      console.log("[Dashboard] Task completed:", result);

      // Process the result and create transactions
      if (result.status === "success" && result.final_result) {
        const agentHierarchy = result.final_result.agent_hierarchy || [];
        const agentUsage = result.final_result.agent_token_usage || {};

        // Create transactions based on agent usage
        const newTransactions: Transaction[] = [];
        const agentNamesUsed: string[] = [];
        let totalCost = 0;

        // Create a transaction for each agent in the hierarchy
        agentHierarchy.forEach((hierarchyAgent: any) => {
          const agentName = hierarchyAgent.agent_name || "";
          const agent = findAgentByName(agentName);

          if (agent) {
            const cost = agent.cost;
            totalCost += cost;

            newTransactions.push({
              id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              from: "main-agent",
              to: agent.id,
              amount: cost,
              currency: "RLUSD",
              timestamp: new Date().toISOString(),
              status: "confirmed",
              type: "payment",
              memo: `Payment for processing task: "${promptText.substring(
                0,
                30
              )}${promptText.length > 30 ? "..." : ""}"`,
            });

            agentNamesUsed.push(agent.name);
          }
        });

        // If no transactions were created but we have agent usage, create transactions from that
        if (
          newTransactions.length === 0 &&
          Object.keys(agentUsage).length > 0
        ) {
          Object.entries(agentUsage).forEach(([agentName, usage]) => {
            const agent = findAgentByName(agentName);

            if (agent) {
              const cost = agent.cost;
              totalCost += cost;

              newTransactions.push({
                id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: "main-agent",
                to: agent.id,
                amount: cost,
                currency: "RLUSD",
                timestamp: new Date().toISOString(),
                status: "confirmed",
                type: "payment",
                memo: `Payment for processing task: "${promptText.substring(
                  0,
                  30
                )}${promptText.length > 30 ? "..." : ""}"`,
              });

              agentNamesUsed.push(agent.name);
            }
          });
        }

        // If still no transactions, create one for the default agent
        if (newTransactions.length === 0) {
          const defaultAgent = network.nodes.find(
            (node) => node.id === "text-gen-1"
          );
          if (defaultAgent) {
            const cost = defaultAgent.cost;
            totalCost = cost;

            newTransactions.push({
              id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              from: "main-agent",
              to: defaultAgent.id,
              amount: cost,
              currency: "RLUSD",
              timestamp: new Date().toISOString(),
              status: "confirmed",
              type: "payment",
              memo: `Payment for processing task: "${promptText.substring(
                0,
                30
              )}${promptText.length > 30 ? "..." : ""}"`,
            });

            agentNamesUsed.push(defaultAgent.name);
          }
        }

        // Add transactions to state
        setTransactions((prev) => [...newTransactions, ...prev]);

        // Update network with transactions
        updateNetwork(
          newTransactions.map((tx) => tx.to),
          newTransactions
        );

        // Update main agent balance
        setBalance((prev) => prev - totalCost);

        // Store result information for modal
        setTaskResult(
          result.final_result.final_output || "Task completed successfully!"
        );
        setTaskAgents(agentNamesUsed);
        setTaskCost(totalCost);

        // Show the task result modal
        setShowTaskResult(true);
      }
    } catch (error) {
      console.error("[Dashboard] Submission error:", error);
    } finally {
      // Reset agent status
      resetAgentStatus();
      setProcessing(false);
    }
  };

  // Analyze the prompt and determine which agents to use
  const analyzePromptAndSelectAgents = async (promptText: string) => {
    try {
      // Use existing analysis function
      const result = await analyzePrompt(promptText);

      // Map selected agent IDs to actual agent objects
      const selectedAgents = result.selectedAgents
        .map((id) => network.nodes.find((node) => node.id === id))
        .filter((agent) => agent !== undefined) as Agent[];

      // If no agents were found, default to text-gen-1
      if (selectedAgents.length === 0) {
        const defaultAgent = network.nodes.find(
          (node) => node.id === "text-gen-1"
        );
        if (defaultAgent) {
          selectedAgents.push(defaultAgent);
        }
      }

      return selectedAgents;
    } catch (error) {
      console.error("Error analyzing prompt:", error);
      // Default to text-gen-1 if analysis fails
      const defaultAgent = network.nodes.find(
        (node) => node.id === "text-gen-1"
      );
      return defaultAgent ? [defaultAgent] : [];
    }
  };

  // Find an agent by name
  const findAgentByName = (name: string): Agent | undefined => {
    // Try direct match first
    let agent = network.nodes.find(
      (node) => node.name.toLowerCase() === name.toLowerCase()
    );

    if (agent) return agent;

    // Try to match by removing spaces in agent name
    const normalizedName = name.replace(/\s+/g, "").toLowerCase();

    agent = network.nodes.find((node) => {
      const nodeName = node.name.replace(/\s+/g, "").toLowerCase();
      return nodeName === normalizedName;
    });

    if (agent) return agent;

    // Try to match by substring
    agent = network.nodes.find((node) =>
      node.name.toLowerCase().includes(name.toLowerCase())
    );

    if (agent) return agent;

    // Map specific agent names from the API to our network
    const nameMapping: Record<string, string> = {
      "agent 1": "text-gen-1",
      "agent 2": "data-analyzer",
      "agent 3": "research-assistant",
      "agent 4": "summarizer",
    };

    const mappedId = nameMapping[name.toLowerCase()];
    if (mappedId) {
      return network.nodes.find((node) => node.id === mappedId);
    }

    return undefined;
  };

  // Reset agent status after task completion or error
  const resetAgentStatus = () => {
    setNetwork((prevNetwork) => {
      const updatedNodes = prevNetwork.nodes.map((node) => {
        if (node.status === "processing") {
          return { ...node, status: "active" };
        }
        return node;
      });
      return { ...prevNetwork, nodes: updatedNodes };
    });
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
            status: "active", // Reset processing status
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

        if (source === "main-agent" && agentIds.includes(target)) {
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

      {/* Show task result modal when available */}
      {showTaskResult && (
        <TaskResultModal
          isOpen={showTaskResult}
          onClose={() => setShowTaskResult(false)}
          result={taskResult}
          promptText={taskPrompt}
          usedAgents={taskAgents}
          totalCost={taskCost}
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
