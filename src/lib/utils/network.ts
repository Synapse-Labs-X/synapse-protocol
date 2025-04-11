import { Agent, AgentNetwork, AgentLink } from '@/types/agent';
import { Transaction } from '@/types/transaction';

// Define extended agent type for visualization that includes position coordinates
export interface AgentWithPosition extends Agent {
  x?: number;
  y?: number;
}

/**
 * Creates a network graph data structure from agents and transactions
 */
export function createNetworkFromAgents(
  agents: Agent[],
  transactions: Transaction[] = []
): AgentNetwork {
  const nodes = [...agents];

  // Create initial links between main agent and all others
  const mainAgent = agents.find(agent => agent.type === 'main');
  const mainAgentId = mainAgent?.id || '';

  const links: AgentLink[] = [];

  if (mainAgentId) {
    // Connect main agent to all others
    agents.forEach(agent => {
      if (agent.id !== mainAgentId) {
        links.push({
          source: mainAgentId,
          target: agent.id,
          value: 0
        });
      }
    });
  }

  // Update link values based on transactions
  transactions.forEach(tx => {
    // Using string type safety
    const existingLink = links.find(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      return (source === tx.from && target === tx.to) ||
        (source === tx.to && target === tx.from);
    });

    if (existingLink) {
      existingLink.value = (existingLink.value || 0) + 1;
      existingLink.lastTransaction = tx.timestamp;
    } else {
      links.push({
        source: tx.from,
        target: tx.to,
        value: 1,
        lastTransaction: tx.timestamp
      });
    }
  });

  return { nodes, links };
}

/**
 * Calculates agent positions for visualization layout
 * This is a simple function that positions agents in a circle
 */
export function calculateAgentPositions(
  agents: Agent[],
  centerX = 0,
  centerY = 0,
  radius = 300
): AgentWithPosition[] {
  // Find the main agent
  const mainAgent = agents.find(agent => agent.type === 'main');
  const otherAgents = agents.filter(agent => agent.type !== 'main');

  const positionedAgents: AgentWithPosition[] = [...agents];

  // Position main agent at center
  if (mainAgent) {
    const mainAgentIndex = positionedAgents.findIndex(a => a.id === mainAgent.id);
    if (mainAgentIndex >= 0) {
      positionedAgents[mainAgentIndex] = {
        ...positionedAgents[mainAgentIndex],
        x: centerX,
        y: centerY
      };
    }
  }

  // Position other agents in a circle around the main agent
  const angleStep = (2 * Math.PI) / otherAgents.length;

  otherAgents.forEach((agent, index) => {
    const angle = index * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const agentIndex = positionedAgents.findIndex(a => a.id === agent.id);
    if (agentIndex >= 0) {
      positionedAgents[agentIndex] = {
        ...positionedAgents[agentIndex],
        x,
        y
      };
    }
  });

  return positionedAgents;
}

/**
 * Safely extracts node ID regardless of whether it's a string or object
 */
function getNodeId(node: string | { id: string }): string {
  return typeof node === 'string' ? node : node.id;
}

/**
 * Finds the path between two agents in the network
 */
export function findPathBetweenAgents(
  network: AgentNetwork,
  startAgentId: string,
  endAgentId: string
): string[] {
  // Simple implementation using BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [{ id: startAgentId, path: [startAgentId] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const { id, path } = current;

    if (id === endAgentId) {
      return path;
    }

    if (!visited.has(id)) {
      visited.add(id);

      // Find all connected agents
      const connections = network.links.filter(link => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        return sourceId === id || targetId === id;
      });

      for (const connection of connections) {
        const sourceId = getNodeId(connection.source);
        const targetId = getNodeId(connection.target);

        const nextId = sourceId === id ? targetId : sourceId;

        if (!visited.has(nextId)) {
          queue.push({ id: nextId, path: [...path, nextId] });
        }
      }
    }
  }

  return []; // No path found
}