"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import AgentNetwork from "@/components/dashboard/AgentNetwork"; // Import our enhanced component
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
import StatusBar from "@/components/dashboard/StatusBar";
import AgentDetails from "@/components/dashboard/AgentDetails";
import PromptInput from "@/components/dashboard/PromptInput";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import { analyzePrompt } from "@/lib/agents/analysis";
import { executeTransactions } from "@/lib/agents/orchestrator";

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

  // Set mounted state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Initialize network data
  useEffect(() => {
    if (!hasMounted) return;

    // Simulate loading delay
    const loadTimer = setTimeout(() => {
      const initialNodes: Agent[] = [
        {
          id: "main-agent",
          name: "Orchestrator Agent",
          type: "main",
          balance: 995,
          cost: 0,
          status: "active",
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
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(loadTimer);
  }, [hasMounted]);

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

  // Show loading state while initializing
  if (!hasMounted || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Image
            src="/synapse-logo.png"
            alt="Synapse Logo"
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white">Loading Synapse Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Status Bar */}
      <StatusBar
        balance={balance}
        network="XRP Testnet"
        transactionCount={transactions.length}
        mainAgent={network.nodes.find((node) => node.id === "main-agent")}
        agents={network.nodes}
        onTransactionComplete={() => {
          // Refresh data after transaction
          setTransactions((prev) => [...prev]);
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Network Graph */}
        <div className="w-2/3 border-r border-gray-700">
          <div className="h-full">
            <AgentNetwork
              network={network}
              onNodeClick={handleAgentSelect}
              selectedAgents={selectedAgents.map((agent) => agent.id)}
              processingTransaction={processing}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/3 flex flex-col">
          {/* Agent Interaction */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold mb-3">Agent Interaction</h2>
            <PromptInput
              onSubmit={handleSubmit}
              selectedAgents={selectedAgents}
              isProcessing={processing}
            />
          </div>

          {/* Recent Transactions */}
          <div className="flex-1 overflow-y-auto p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold mb-3">Recent Transactions</h2>
            <TransactionHistory
              transactions={transactions}
              agents={network.nodes}
            />
          </div>

          {/* Agent Details (conditionally rendered) */}
          {selectedAgent && (
            <div className="p-4">
              <AgentDetails
                agent={selectedAgent}
                onClose={handleCloseDetails}
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
    </div>
  );
}
