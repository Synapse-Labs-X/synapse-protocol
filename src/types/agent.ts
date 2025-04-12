// Agent type definitions for Synapse

export type AgentType = 'main' | 'text' | 'image' | 'data' | 'assistant';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  balance: number;
  cost: number;
  description?: string;
  capabilities?: string[];
  walletAddress?: string;
  status?: 'active' | 'inactive' | 'processing';
  lastActive?: string;
}

// For force-directed graph compatibility
export interface AgentLink {
  source: string | Agent;
  target: string | Agent;
  value?: number;
  active?: boolean;
  returnToMain?: boolean;
}

export interface AgentNetwork {
  nodes: Agent[];
  links: AgentLink[];
}

export interface AgentSelectionResult {
  selectedAgents: string[];
  reasoning: {
    [agentId: string]: string;
  };
  estimatedCost: number;
}

export interface AgentExecutionResult {
  agentId: string;
  success: boolean;
  output: string;
  executionTime: number;
  transactionId?: string;
}

// Agent service capabilities
export interface AgentService {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedTime: number; // in milliseconds
}

// Agent selection criteria
export interface AgentSelectionCriteria {
  taskType?: string[];
  maxCost?: number;
  preferredAgents?: string[];
  excludedAgents?: string[];
  requirementPriority?: 'cost' | 'speed' | 'quality';
}