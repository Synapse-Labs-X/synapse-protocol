/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { analyzePrompt } from "@/lib/agents/analysis";
import Image from "next/image";
import TaskResultModal from "@/components/task/TaskResultModal";
import socketService from "@/lib/utils/crewAiWebSocketService";
import {
  waitForRunCompletion,
  extractAgentInfo,
} from "@/lib/utils/crewAISocket";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

// Log update type definition for CrewAI WebSocket logs
interface CrewAILogUpdate {
  type: string;
  run_id: string;
  log_prefix?: string;
  data: any;
}

export default function DashboardPage() {
  // State management
  const isMobile = useIsMobile();
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
    if (!isMobile) walletService.initialize().catch(console.error);

    // Initialize the socket connection
    initializeSocketConnection();

    return () => {
      // Clean up socket connection on unmount
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  /**
   * Initialize WebSocket connection to the CrewAI backend
   */
  const initializeSocketConnection = async () => {
    if (socketService.isConnected()) {
      console.log("Socket already connected.");
      // Update event handlers for the existing connection
      socketService.updateEventHandlers({
        onLogUpdate: handleLogUpdate,
      });
      return;
    }

    console.log("Connecting to CrewAI WebSocket server...");

    try {
      await socketService.connect({
        onConnect: () => {
          console.log("Connected to CrewAI WebSocket server");
        },
        onDisconnect: (reason) => {
          console.log(`Disconnected from CrewAI WebSocket server: ${reason}`);
        },
        onConnectError: (error) => {
          console.error(`CrewAI WebSocket connection error: ${error.message}`);
        },
        onError: (error) => {
          console.error("CrewAI WebSocket error:", error);
        },
        onLogUpdate: handleLogUpdate,
        onRunComplete: (payload) => {
          handleRunComplete(payload);
        },
        onJoinedRoom: (data) => {
          console.log("Joined room:", data);
        },
      });

      console.log("Successfully connected to CrewAI WebSocket server");
    } catch (error) {
      console.error("Failed to initialize socket connection:", error);
    }
  };

  /**
   * Handle the run_complete event from the WebSocket
   */
  const handleRunComplete = async (payload: any) => {
    console.log("Run complete received:", payload);

    const runId = payload.run_id;
    const status = payload.status;

    if (!runId) {
      console.error("No run_id in the payload");
      setProcessing(false);
      return;
    }

    try {
      // Fetch the final results from the API
      const result = await fetchFinalResults(runId);
      console.log("Final result fetched:", result);

      // Update UI with the results
      setTaskResult(
        result.final_output ||
          result.final_result?.final_output ||
          "Task completed successfully!"
      );

      // Extract agent names
      const agentNames = extractAgentNamesFromResult(result);
      setTaskAgents(agentNames);

      // Calculate cost
      const totalCost = calculateTotalCost(result);
      setTaskCost(totalCost);

      // Show results modal
      setShowTaskResult(true);
    } catch (error) {
      console.error(`Error fetching results for run ${runId}:`, error);
    } finally {
      // Reset processing state
      setProcessing(false);
    }
  };

  // Initialize network data
  useEffect(() => {
    if (!hasMounted) return;

    // Simulate loading delay with a modern loading animation
    const loadTimer = setTimeout(async () => {
      let walletAddress = "";
      if (!isMobile)
        walletAddress = (await walletService.getWalletAddress()) || "";
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
  }, [hasMounted, isMobile]);

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

  // Handle prompt submission with CrewAI WebSocket integration
  // Update the handleSubmit function to use the WebSocket service
  /**
   * Handle prompt submission and start a task through WebSocket
   * @param promptText The user's task description
   */
  const handleSubmit = async (promptText: string) => {
    if (!promptText.trim()) return;

    setProcessing(true);
    console.log("[Dashboard] Submitting task:", promptText);

    try {
      // Store the prompt for later use
      setTaskPrompt(promptText);

      // Clear any previous agents selection
      setSelectedAgents([]);

      // Reset any previous task results
      setTaskResult("");
      setTaskAgents([]);
      setTaskCost(0);

      // First, get the main agent to start the visualization chain
      const mainAgent = network.nodes.find((node) => node.id === "main-agent");
      if (mainAgent) {
        setSelectedAgents([mainAgent]);
      }

      // Pre-analyze prompt for a better initial guess at the required agents
      // (this will be refined when hierarchy comes from backend)
      const potentialAgents = await analyzePromptAndSelectAgents(promptText);

      // Make sure socket is connected with our handlers
      if (!socketService.isConnected()) {
        await initializeSocketConnection();
      } else {
        // Update event handlers for the existing connection
        socketService.updateEventHandlers({
          onLogUpdate: handleLogUpdate,
          onRunComplete: handleRunComplete,
        });
      }

      // Start the task with the CrewAI backend
      const runId = await socketService.startTask(promptText);
      console.log(`[Dashboard] Task started with run ID: ${runId}`);

      // The rest will be handled by the WebSocket event handlers:
      // 1. handleLogUpdate will update the visualization as agents are created/used
      // 2. handleRunComplete will fetch the final result when done
    } catch (error) {
      console.error("[Dashboard] Submission error:", error);

      // Reset processing state
      setProcessing(false);

      // Reset network visualization
      resetAgentStatus();
    }
  };

  // Analyze prompt and select appropriate agents
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

  // Create an agent chain from CrewAI hierarchy
  const createAgentChainFromHierarchy = (
    hierarchy: any[],
    mainAgent: Agent,
    allAgents: Agent[]
  ): Agent[] => {
    // Start with the main agent
    const chain: Agent[] = [mainAgent];

    // Helper function to find an agent by name
    const findAgentByName = (name: string): Agent | undefined => {
      // Format the name to match potential agent names
      const formattedName = name.replace(/_/g, " ");

      // Try to find a direct match
      let agent = allAgents.find(
        (a) => a.name.toLowerCase() === formattedName.toLowerCase()
      );

      // If no direct match, try to find a partial match
      if (!agent) {
        agent = allAgents.find(
          (a) =>
            a.name.toLowerCase().includes(formattedName.toLowerCase()) ||
            formattedName.toLowerCase().includes(a.name.toLowerCase())
        );
      }

      return agent;
    };

    // Sort hierarchy by level if available
    const sortedHierarchy = [...hierarchy].sort(
      (a, b) => (a.level || 0) - (b.level || 0)
    );

    // Add agents to chain based on hierarchy
    for (const item of sortedHierarchy) {
      const agentName = item.agent_name;
      if (agentName) {
        const agent = findAgentByName(agentName);
        if (agent && !chain.includes(agent)) {
          chain.push(agent);
        }
      }
    }

    // If no agents were found (other than main), default to text-gen-1
    if (chain.length === 1) {
      const defaultAgent = allAgents.find((a) => a.id === "text-gen-1");
      if (defaultAgent) {
        chain.push(defaultAgent);
      }
    }

    return chain;
  };

  const fetchFinalResults = async (runId: string) => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          "https://crewai-api-61qj.onrender.com"
        }/results/${runId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch results: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching final results:", error);
      throw error;
    }
  };

  // Handle WebSocket log updates
  // Update the WebSocket log handler to visualize agent workflow in real-time
  const handleLogUpdate = (payload: CrewAILogUpdate) => {
    console.log(`[CrewAI Log] ${payload.type}:`, payload.data);

    const runId = payload.run_id;

    // Handle hierarchy generation - set up the potential agent workflow
    if (payload.type === "hierarchy_generated" && payload.data?.hierarchy) {
      const hierarchy = payload.data.hierarchy;
      console.log("Agent hierarchy received:", hierarchy);

      // Store the main agent as the first node in our visualization chain
      const mainAgent = network.nodes.find((node) => node.id === "main-agent");
      if (mainAgent) {
        // Start with just the main agent selected
        setSelectedAgents([mainAgent]);
      }
    }

    // When an agent is created, add it to the visualization
    if (payload.type === "agent_created" && payload.data?.agent_name) {
      const agentName = payload.data.agent_name;
      console.log(`Agent created: ${agentName}`);

      // Find the corresponding agent in our network
      const agent = findAgentByName(agentName, network.nodes);

      if (agent) {
        // Add this agent to the selected agents chain, preserving order
        setSelectedAgents((prev) => {
          // Only add if not already in the chain
          if (!prev.some((a) => a.id === agent.id)) {
            return [...prev, agent];
          }
          return prev;
        });

        // Update the agent's status to "processing"
        setNetwork((prevNetwork) => {
          const updatedNodes = prevNetwork.nodes.map((node) => {
            if (node.id === agent.id) {
              return { ...node, status: "processing" as const };
            }
            return node;
          });

          return { ...prevNetwork, nodes: updatedNodes };
        });

        // If we have more than one agent in the chain, create a transaction
        // to visualize the flow between the previous agent and this one
        setSelectedAgents((current) => {
          if (current.length > 1) {
            const previousAgent = current[current.length - 2];

            // Create and visualize the transaction
            const transaction: Transaction = {
              id: `ws-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              from: previousAgent.id,
              to: agent.id,
              amount: agent.cost,
              currency: "RLUSD",
              timestamp: new Date().toISOString(),
              status: "confirmed",
              type: "payment",
              memo: `Agent workflow: ${previousAgent.name} -> ${agent.name}`,
            };

            // Add the transaction to the UI
            setTransactions((prev) => [transaction, ...prev]);

            // Update the network visualization
            updateNetworkWithTransaction(transaction);
          }

          return current;
        });
      }
    }

    // When a task starts for an agent
    if (payload.type === "task_start" && payload.data?.agent_name) {
      const agentName = payload.data.agent_name;
      const agent = findAgentByName(agentName, network.nodes);

      if (agent) {
        // Highlight the agent that's currently active
        setNetwork((prevNetwork) => {
          const updatedNodes = prevNetwork.nodes.map((node) => {
            if (node.id === agent.id) {
              return { ...node, status: "processing" as const };
            } else if (node.status === "processing") {
              // Set other processing agents back to active
              return { ...node, status: "active" as const };
            }
            return node;
          });

          return { ...prevNetwork, nodes: updatedNodes };
        });
      }
    }

    // When a task completes
    if (payload.type === "task_end" && payload.data?.agent_name) {
      const agentName = payload.data.agent_name;
      const agent = findAgentByName(agentName, network.nodes);

      if (agent) {
        // Mark this agent as complete
        setNetwork((prevNetwork) => {
          const updatedNodes = prevNetwork.nodes.map((node) => {
            if (node.id === agent.id) {
              return { ...node, status: "active" as const };
            }
            return node;
          });

          return { ...prevNetwork, nodes: updatedNodes };
        });
      }
    }

    // When the run completes
    if (payload.type === "run_complete") {
      const status = payload.data?.status;
      console.log(`Run ${runId} completed with status: ${status}`);

      // Fetch the final results from the API endpoint
      fetchFinalResults(runId)
        .then((result) => {
          console.log("Final result fetched:", result);

          // Update the task result data
          setTaskResult(
            result.final_output ||
              result.final_result?.final_output ||
              "Task completed successfully!"
          );

          // Extract agent names from the result for display
          const agentNames = extractAgentNamesFromResult(result);
          setTaskAgents(agentNames);

          // Calculate total cost (if available in the result)
          const totalCost = calculateTotalCost(result);
          setTaskCost(totalCost);

          // Show the result modal
          setShowTaskResult(true);

          // Reset processing state
          setProcessing(false);
        })
        .catch((error) => {
          console.error("Error fetching final results:", error);
          setProcessing(false);
        });
    }
  };

  // Calculate total cost from the result
  const calculateTotalCost = (result: any): number => {
    let totalCost = 0;

    // Check for agent token usage with cost info
    if (result.agent_token_usage) {
      for (const agent in result.agent_token_usage) {
        const usage = result.agent_token_usage[agent];
        if (usage && typeof usage.estimated_cost_usd === "number") {
          totalCost += usage.estimated_cost_usd;
        }
      }
    }

    // If no cost found but we have selected agents, use their costs
    if (totalCost === 0 && selectedAgents.length > 0) {
      totalCost = selectedAgents.reduce((sum, agent) => sum + agent.cost, 0);
    }

    return totalCost;
  };

  // Helper function to extract agent names from the result
  const extractAgentNamesFromResult = (result: any): string[] => {
    const agentNames: string[] = [];

    // Try to get agent names from agent_hierarchy
    if (result.agent_hierarchy && Array.isArray(result.agent_hierarchy)) {
      result.agent_hierarchy.forEach((agent: any) => {
        if (agent.agent_name) {
          agentNames.push(agent.agent_name.replace(/_/g, " "));
        }
      });
    }

    // If no agent hierarchy, try to get from agent_token_usage
    if (agentNames.length === 0 && result.agent_token_usage) {
      agentNames.push(...Object.keys(result.agent_token_usage));
    }

    // If we have selected agents in the UI, use those names
    if (agentNames.length === 0 && selectedAgents.length > 0) {
      agentNames.push(...selectedAgents.map((agent) => agent.name));
    }

    return agentNames;
  };

  // Helper function to find an agent by name
  const findAgentByName = (
    name: string,
    agents: Agent[]
  ): Agent | undefined => {
    const formattedName = name.replace(/_/g, " ").toLowerCase();

    // Try direct match first
    let agent = agents.find((a) => a.name.toLowerCase() === formattedName);

    // If no direct match, try partial match
    if (!agent) {
      agent = agents.find(
        (a) =>
          a.name.toLowerCase().includes(formattedName) ||
          formattedName.includes(a.name.toLowerCase())
      );
    }

    return agent;
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
          promptText={taskPrompt}
          result={taskResult}
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
        isMobile={isMobile} // Pass mobile flag to layout
      />
    </ClientSideOnly>
  );
}
