/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/utils/crewAISocket.ts
import socketService from "./crewAiWebSocketService";

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
    // First, make sure we're connected
    if (!socketService.isConnected()) {
      socketService.connect().catch((error) => {
        reject(new Error(`Failed to connect to socket service: ${error.message}`));
      });
    }

    // Make sure we're in the correct room
    socketService.joinRoom(runId);

    // Set up a one-time handler for run completion
    const handleRunComplete = (data: any) => {
      // Only handle events for our specific run
      if (data.run_id === runId) {
        // Remove the handler to avoid memory leaks
        socketService.updateEventHandlers({
          onRunComplete: undefined
        });
        resolve(data);
      }
    };

    // Set a timeout to prevent waiting forever
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timeout = setTimeout(() => {
      // Remove the handler to avoid memory leaks
      socketService.updateEventHandlers({
        onRunComplete: undefined
      });
      reject(
        new Error(
          `Timed out waiting for run ${runId} to complete after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    // Add the handler
    socketService.updateEventHandlers({
      onRunComplete: handleRunComplete
    });
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
    (agent: any) => agent.agent_name.replace(/_/g, ' ') || "Unknown Agent"
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