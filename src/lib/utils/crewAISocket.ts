/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/utils/crewAISocket.ts
import { socketManager } from "./socket";

/**
 * Helper function to wait for a run to complete
 * @param runId The run ID to wait for
 * @param timeoutMs Timeout in milliseconds (default: 60000 - 60 seconds)
 * @returns Promise that resolves with the run_complete data
 */
export const waitForRunCompletion = (
  runId: string,
  timeoutMs = 60000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const socket = socketManager.getSocket();

    // Set a timeout to prevent waiting forever
    const timeout = setTimeout(() => {
      socket.off("run_complete", handleRunComplete);
      reject(
        new Error(
          `Timed out waiting for run ${runId} to complete after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    // Handler for run completion
    const handleRunComplete = (data: any) => {
      // Only handle events for our specific run
      if (data.run_id === runId) {
        clearTimeout(timeout);
        socket.off("run_complete", handleRunComplete);
        resolve(data);
      }
    };

    // Listen for the run_complete event
    socket.on("run_complete", handleRunComplete);

    // Join the room for this run
    socket.emit("join_room", { run_id: runId });
  });
};

/**
 * Extract agent information from CrewAI result
 * @param result The CrewAI result object
 * @returns Agent names, hierarchy and other information
 */
export const extractAgentInfo = (result: any) => {
  const finalResult = result?.final_result || {};
  const agentHierarchy = finalResult.agent_hierarchy || [];
  const agentUsage = finalResult.agent_token_usage || {};

  // Extract agent names from hierarchy
  const agentNames = agentHierarchy.map(
    (agent: any) => agent.agent_name || "Unknown Agent"
  );

  // Extract cost information if available
  const costs = Object.entries(agentUsage).map(
    ([agentName, usage]: [string, any]) => {
      return {
        agentName,
        tokenUsage: usage?.total_tokens || 0,
        estimatedCost: usage?.estimated_cost_usd || 0,
      };
    }
  );

  return {
    agentNames,
    hierarchy: agentHierarchy,
    costs,
    totalEstimatedCost: costs.reduce(
      (sum, item) => sum + item.estimatedCost,
      0
    ),
  };
};
