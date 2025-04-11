"use client";

import React, { useState, useEffect } from "react";
import AgentNetwork from "@/components/dashboard/AgentNetwork";
import AgentDetails from "@/components/dashboard/AgentDetails";
import PromptInput from "@/components/dashboard/PromptInput";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import StatusBar from "@/components/dashboard/StatusBar";
import { Agent, AgentNetwork as AgentNetworkType } from "@/types/agent";
import { Transaction } from "@/types/transaction";
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
  const [balance, setBalance] = useState<number>(1000); // Initial RLUSD balance
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize mock network data
  useEffect(() => {
    // Simulate loading delay
    const loadTimer = setTimeout(() => {
      const initialNodes: Agent[] = [
        {
          id: "main-agent",
          name: "Orchestrator Agent",
          type: "main",
          balance: 1000,
          cost: 0,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Central orchestration agent that routes tasks and manages payment flows between specialized AI agents.",
        },
        {
          id: "text-gen-1",
          name: "Text Generator",
          type: "text",
          balance: 0,
          cost: 5,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Generates high-quality text content based on input prompts.",
        },
        {
          id: "image-gen-1",
          name: "Image Creator",
          type: "image",
          balance: 0,
          cost: 10,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Creates visual content and imagery based on text descriptions.",
        },
        {
          id: "data-analyzer",
          name: "Data Analyzer",
          type: "data",
          balance: 0,
          cost: 7,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Processes and analyzes datasets to extract insights and visualizations.",
        },
        {
          id: "research-assistant",
          name: "Research Assistant",
          type: "assistant",
          balance: 0,
          cost: 8,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Performs comprehensive research on topics and provides organized findings.",
        },
        {
          id: "code-generator",
          name: "Code Generator",
          type: "text",
          balance: 0,
          cost: 6,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Writes code in various programming languages based on functional requirements.",
        },
        {
          id: "translator",
          name: "Language Translator",
          type: "text",
          balance: 0,
          cost: 4,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Translates content between different languages while preserving meaning and nuance.",
        },
        {
          id: "summarizer",
          name: "Content Summarizer",
          type: "assistant",
          balance: 0,
          cost: 3,
          status: "active",
          lastActive: new Date().toISOString(),
          description:
            "Condenses long-form content into concise summaries while preserving key information.",
        },
      ];

      // Initial connections
      const initialLinks = [
        { source: "main-agent", target: "text-gen-1", value: 0 },
        { source: "main-agent", target: "image-gen-1", value: 0 },
        { source: "main-agent", target: "data-analyzer", value: 0 },
        { source: "main-agent", target: "research-assistant", value: 0 },
        { source: "main-agent", target: "code-generator", value: 0 },
        { source: "main-agent", target: "translator", value: 0 },
        { source: "main-agent", target: "summarizer", value: 0 },
      ];

      setNetwork({ nodes: initialNodes, links: initialLinks });
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(loadTimer);
  }, []);

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
      // Deep clone to avoid direct state mutation
      const updatedNodes = [...prevNetwork.nodes].map((node) => {
        // Update node balances
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

      const updatedLinks = [...prevNetwork.links].map((link) => {
        if (typeof link.source === "object") {
          // Handle case where link.source is already an object
          if (
            link.source.id === "main-agent" &&
            agentIds.includes(
              typeof link.target === "object"
                ? link.target.id
                : (link.target as string)
            )
          ) {
            return {
              ...link,
              value: (link.value as number) + 1,
            };
          }
        } else {
          // Handle case where link.source is a string
          if (
            link.source === "main-agent" &&
            agentIds.includes(link.target as string)
          ) {
            return {
              ...link,
              value: (link.value as number) + 1,
            };
          }
        }
        return link;
      });

      return {
        nodes: updatedNodes,
        links: updatedLinks,
      };
    });
  };

  // Handler for agent selection in the network graph
  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  // Close agent details panel
  const handleCloseDetails = () => {
    setSelectedAgent(null);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white">Loading Synapse Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header with Status Bar */}
      <StatusBar
        balance={balance}
        network="XRP Testnet"
        transactionCount={transactions.length}
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
