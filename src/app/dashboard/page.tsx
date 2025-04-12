// src/app/dashboard/page.tsx - Updated with wallet caching

"use client";

import React, { useState, useEffect } from "react";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import { analyzePrompt } from "@/lib/agents/analysis";
import { executeTransactions } from "@/lib/agents/orchestrator";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ClientSideOnly from "@/components/ClientSideOnly";
import WalletInitialization from "@/components/dashboard/WalletInitialization";
import walletInitService from "@/lib/xrp/walletInitService";
import transactionService from "@/lib/xrp/transactionService";
import Image from "next/image";

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

  // Wallet initialization states
  const [initializing, setInitializing] = useState<boolean>(false);
  const [initProgress, setInitProgress] = useState<{
    initialized: string[];
    pending: string[];
    failed: string[];
    cached: string[]; // Added cached property
    progress: number;
  }>({
    initialized: [],
    pending: [],
    failed: [],
    cached: [], // Track which wallets were loaded from cache
    progress: 0,
  });
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Set mounted state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Initialize network data
  useEffect(() => {
    if (!hasMounted) return;

    // Simulate loading delay with a modern loading animation
    const loadTimer = setTimeout(() => {
      const initialNodes: Agent[] = [
        {
          id: "main-agent",
          name: "Orchestrator Agent",
          type: "main",
          balance: 995,
          cost: 0,
          status: "active",
          walletAddress: "rMainAgentAddressHere123456789", // Wallet address for Crossmark integration
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

    // Start with all agents pending
    setInitProgress({
      initialized: [],
      pending: agents.map((agent) => agent.id),
      failed: [],
      cached: [],
      progress: 0,
    });

    try {
      // Use a manual approach to track initializations
      let currentProgress = { ...initProgress };
      let initComplete = false;

      // Start the wallet initialization with caching support
      const initPromise = walletInitService.initializeAllWallets(agents);

      // Poll for progress updates
      const intervalId = setInterval(() => {
        const progress = walletInitService.getInitializationProgress();

        // Update our state with the latest progress
        setInitProgress(progress);
        currentProgress = progress;

        // Check if initialization is complete (no more pending wallets)
        if (progress.pending.length === 0 && !initComplete) {
          initComplete = true;
          clearInterval(intervalId);

          // Mark initialized wallets in transaction service for faster operations
          transactionService.markWalletsAsInitialized(progress.initialized);

          // Create trustlines for initialized wallets (except main agent)
          walletInitService
            .createTrustlinesForAgents(
              progress.initialized.filter((id) => id !== "main-agent")
            )
            .then(() => {
              // After trustlines are set up, we can move to the dashboard
              setTimeout(() => {
                setInitializing(false);
                setIsLoading(false);
              }, 1000);
            })
            .catch((err) => {
              console.error("Failed to create trustlines:", err);
              // Still proceed to dashboard even if trustlines fail
              setTimeout(() => {
                setInitializing(false);
                setIsLoading(false);
              }, 1000);
            });
        }
      }, 500);

      // Wait for the initialization to complete or timeout after 30 seconds
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          if (!initComplete) {
            reject(new Error("Wallet initialization timed out"));
          }
        }, 30000); // 30 second timeout
      });

      try {
        // Wait for either initialization to complete or timeout
        await Promise.race([initPromise, timeoutPromise]);
      } catch (error) {
        console.error("Wallet initialization failed or timed out:", error);
        clearInterval(intervalId);

        // If we have any initialized wallets, we can still proceed
        if (currentProgress.initialized.length > 0) {
          transactionService.markWalletsAsInitialized(
            currentProgress.initialized
          );
        }

        // Proceed to dashboard with whatever wallets we have
        setTimeout(() => {
          setInitializing(false);
          setIsLoading(false);
        }, 1000);
      }
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

    try {
      // Analyze prompt to determine which agents to use
      const analysisResult = await analyzePrompt(promptText);

      // Find the selected agent objects based on IDs
      const agents = network.nodes.filter((agent) =>
        analysisResult.selectedAgents.includes(agent.id)
      );

      // Update agent statuses to processing
      setNetwork((prevNetwork) => ({
        ...prevNetwork,
        nodes: prevNetwork.nodes.map((node) => {
          if (analysisResult.selectedAgents.includes(node.id)) {
            return { ...node, status: "processing" };
          }
          return node;
        }),
      }));

      setSelectedAgents(agents);

      // Create transactions with selected agents
      const transactionResults = await executeTransactions(
        "main-agent",
        analysisResult.selectedAgents,
        agents.map((agent) => agent.cost)
      );

      // Add new transactions to the list
      setTransactions((prev) =>
        [
          ...transactionResults.map((result) => result.transaction),
          ...prev,
        ].slice(0, 50)
      );

      // Update network with new transaction data
      updateNetwork(
        analysisResult.selectedAgents,
        transactionResults.map((r) => r.transaction)
      );

      // Update balance
      const totalCost = agents.reduce((sum, agent) => sum + agent.cost, 0);
      setBalance((prev) => prev - totalCost);

      // Reset agent statuses after processing
      setTimeout(() => {
        setNetwork((prevNetwork) => ({
          ...prevNetwork,
          nodes: prevNetwork.nodes.map((node) => {
            if (analysisResult.selectedAgents.includes(node.id)) {
              return {
                ...node,
                status: "active",
                lastActive: new Date().toISOString(),
              };
            }
            return node;
          }),
        }));
      }, 2000);
    } catch (error) {
      console.error("Failed to process prompt:", error);
      // Reset agent statuses on error
      setNetwork((prevNetwork) => ({
        ...prevNetwork,
        nodes: prevNetwork.nodes.map((node) => {
          if (selectedAgents.map((a) => a.id).includes(node.id)) {
            return { ...node, status: "active" };
          }
          return node;
        }),
      }));
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setSelectedAgents([]);
      }, 3000);
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

  // Handler for balance updates from Crossmark wallet
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
      id: `crossmark-topup-${Date.now()}`,
      from: "crossmark-wallet",
      to: "main-agent",
      amount: amount,
      currency: "RLUSD",
      timestamp: new Date().toISOString(),
      status: "confirmed",
      type: "payment",
      memo: "Top up from Crossmark wallet",
    };

    // Add the transaction to the list
    setTransactions((prev) => [topUpTransaction, ...prev].slice(0, 50));
  };

  // Add handler to reset wallet caches (for testing purposes)
  const handleResetWalletCaches = () => {
    // Only for development/testing
    if (process.env.NODE_ENV === "development") {
      walletInitService.clearWalletCaches();
      alert(
        "Wallet caches cleared. Refresh the page to re-initialize wallets."
      );
    }
  };

  // Show enhanced loading state while initializing
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

      {/* Hidden dev tools for testing - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
          <button
            onClick={handleResetWalletCaches}
            className="bg-red-900/50 text-red-400 text-xs px-2 py-1 rounded-md border border-red-800/30"
          >
            Reset Wallet Caches (Dev Only)
          </button>
        </div>
      )}
    </ClientSideOnly>
  );
}
