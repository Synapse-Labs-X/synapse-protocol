// src/app/dashboard/page.tsx
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
import Image from "next/image";
import TaskResultModal from "@/components/task/TaskResultModal";
import {
  executeTaskWithCrewAI,
  createAgentChainFromCrewAI,
  CrewAILogUpdate,
} from "@/lib/utils/crewAiWebSocketService";

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

  // Handle prompt submission - UPDATED to use WebSocket service
  const handleSubmit = async (promptText: string) => {
    if (!promptText.trim()) return;

    setProcessing(true);
    console.log("[Dashboard] Submitting task:", promptText);

    try {
      // Store the prompt for the result modal
      setTaskPrompt(promptText);

      // Use the WebSocket service to execute the task
      const result = await executeTaskWithCrewAI(promptText, handleLogUpdate);
      console.log("[Dashboard] Task completed:", result);

      // Set the agent chain for visualization based on crew result
      if (result.success && result.agentHierarchy?.length > 0) {
        // Convert the CrewAI agent hierarchy to our agent chain
        const agentChain = createAgentChainFromCrewAI(result, network.nodes);

        // Update the UI with selected agents
        setSelectedAgents(agentChain);

        // Store the agent chain in the result for later use
        result.agentChain = agentChain;

        // Process the agent chain sequentially for transactions
        if (agentChain.length > 1) {
          const { totalCost, agentNames } = await processAgentChainSequentially(
            agentChain,
            promptText
          );

          // Update main agent balance
          setBalance((prev) => prev - totalCost);

          // Store result information
          setTaskResult(result.finalOutput || "Task completed successfully!");
          setTaskAgents(agentNames);
          setTaskCost(totalCost);

          // Show the task result modal after a short delay
          setTimeout(() => {
            setShowTaskResult(true);
          }, 1000);
        }
      } else {
        // If no agent hierarchy was returned, use a default text generator
        const defaultAgent = network.nodes.find(
          (node) => node.id === "text-gen-1"
        );
        if (defaultAgent) {
          const agentChain = [
            network.nodes.find((node) => node.id === "main-agent") as Agent,
            defaultAgent,
          ].filter(Boolean) as Agent[];

          setSelectedAgents(agentChain);

          // Process the default agent chain
          const { totalCost, agentNames } = await processAgentChainSequentially(
            agentChain,
            promptText
          );

          // Update main agent balance
          setBalance((prev) => prev - totalCost);

          // Store result information
          setTaskResult(
            result.finalOutput ||
              "Task completed with minimal agent involvement."
          );
          setTaskAgents(agentNames);
          setTaskCost(totalCost);

          // Show the task result modal after a short delay
          setTimeout(() => {
            setShowTaskResult(true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error("[Dashboard] Submission error:", error);

      // Reset the network status
      resetAgentStatus();
    } finally {
      setProcessing(false);
    }
  };

  // Handle WebSocket log updates
  const handleLogUpdate = (log: CrewAILogUpdate) => {
    console.log(`[CrewAI Log] ${log.type}:`, log.data);

    // For certain log types, we could update the UI accordingly
    if (log.type === "agent_created") {
      // Highlight the agent in the network
      const agentName = log.data.agent_name;
      if (agentName) {
        // Find the corresponding agent in our network
        const agent = network.nodes.find((node) => node.name === agentName);
        if (agent) {
          setNetwork((prevNetwork) => {
            const updatedNodes = prevNetwork.nodes.map((node) => {
              if (node.id === agent.id) {
                return { ...node, status: "processing" as const };
              }
              return node;
            });
            return { ...prevNetwork, nodes: updatedNodes };
          });
        }
      }
    }
  };

  const updateNetworkWithTransaction = (transaction: Transaction) => {
    setNetwork((prevNetwork) => {
      // First, mark all previously processing agents as active
      const updatedNodes = [...prevNetwork.nodes].map((node) => {
        // Update nodes with new balances
        if (node.id === transaction.from) {
          return {
            ...node,
            balance: node.balance - transaction.amount,
            status: "active" as const, // Set sender to active
          };
        } else if (node.id === transaction.to) {
          return {
            ...node,
            balance: node.balance + transaction.amount,
            status: "processing" as const, // Set receiver to processing
          };
        } else if (node.status === "processing") {
          // Reset any other processing agents to active
          return {
            ...node,
            status: "active" as const,
          };
        }
        return node;
      });

      // Update or create the link between these agents
      let updatedLinks = [...prevNetwork.links];

      // Find if this link already exists
      const existingLinkIndex = updatedLinks.findIndex((link) => {
        const source =
          typeof link.source === "object" ? link.source.id : link.source;
        const target =
          typeof link.target === "object" ? link.target.id : link.target;
        return source === transaction.from && target === transaction.to;
      });

      if (existingLinkIndex >= 0) {
        // Update existing link
        updatedLinks[existingLinkIndex] = {
          ...updatedLinks[existingLinkIndex],
          value: (updatedLinks[existingLinkIndex].value as number) + 1,
          active: true,
        };

        // Deactivate other links
        updatedLinks = updatedLinks.map((link, idx) =>
          idx !== existingLinkIndex ? { ...link, active: false } : link
        );
      } else {
        // Create new link
        // First deactivate all links
        updatedLinks = updatedLinks.map((link) => ({ ...link, active: false }));

        // Then add new active link
        updatedLinks.push({
          source: transaction.from,
          target: transaction.to,
          value: 1,
          active: true,
        });
      }

      return {
        nodes: updatedNodes,
        links: updatedLinks,
      };
    });
  };

  const processAgentChainSequentially = async (
    chain: Agent[],
    promptText: string
  ): Promise<{
    transactions: Transaction[];
    totalCost: number;
    agentNames: string[];
  }> => {
    const transactions: Transaction[] = [];
    const agentNames: string[] = [];
    let totalCost = 0;

    // Process each agent in sequence
    for (let i = 0; i < chain.length - 1; i++) {
      const fromAgent = chain[i];
      const toAgent = chain[i + 1];

      // Skip if trying to send to self (shouldn't happen in proper chain)
      if (fromAgent.id === toAgent.id) continue;

      // Create transaction object
      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`,
        from: fromAgent.id,
        to: toAgent.id,
        amount: toAgent.cost,
        currency: "RLUSD",
        timestamp: new Date(Date.now() + i * 1000).toISOString(), // Sequential timestamps
        status: "confirmed",
        type: "payment",
        memo: `Step ${i + 1}/${
          chain.length - 1
        } of processing task: "${promptText.substring(0, 30)}${
          promptText.length > 30 ? "..." : ""
        }"`,
      };

      transactions.push(transaction);
      totalCost += toAgent.cost;

      if (!agentNames.includes(toAgent.name)) {
        agentNames.push(toAgent.name);
      }

      // Add transaction to UI
      setTransactions((prev) => [transaction, ...prev]);

      // Update network visualization
      updateNetworkWithTransaction(transaction);

      // Add delay between transactions for visual effect
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    return { transactions, totalCost, agentNames };
  };

  // Reset agent status after task completion or error
  const resetAgentStatus = () => {
    setNetwork((prevNetwork) => {
      const updatedNodes = prevNetwork.nodes.map((node) => {
        if (node.status === "processing") {
          return { ...node, status: "active" as const };
        }
        return node;
      });
      return { ...prevNetwork, nodes: updatedNodes };
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
