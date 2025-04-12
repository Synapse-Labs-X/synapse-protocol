/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/utils/crewAiWebSocketService.ts
import { io, Socket } from "socket.io-client";
import { Agent } from "@/types/agent";

// Define types for CrewAI messages
export interface CrewAILogUpdate {
    type: string;
    run_id: string;
    log_prefix: string;
    data: any;
}

export interface CrewAIRunComplete {
    run_id: string;
    status: 'success' | 'error';
    error?: string;
    final_result: {
        run_id: string;
        task_description: string;
        agent_hierarchy: CrewAIAgent[];
        final_output: string;
        task_flow: CrewAITaskFlow[];
        usage_metrics: any;
        agent_token_usage: Record<string, CrewAIAgentUsage>;
        error?: string;
    };
}

export interface CrewAIAgent {
    agent_name: string;
    description: string;
    level: number;
    cost_per_million: number;
    tokens: number;
}

export interface CrewAITaskFlow {
    task_description: string;
    agent_name: string;
    input_context_summary: string;
    output: string;
    token_usage: {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
    };
}

export interface CrewAIAgentUsage {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    token_rate_usd_per_million: number;
    estimated_cost_usd: number;
}

export interface TaskExecutionResult {
    runId: string;
    taskDescription: string;
    agentHierarchy: CrewAIAgent[];
    finalOutput: string;
    agentUsage: Record<string, CrewAIAgentUsage>;
    agentChain: Agent[];
    success: boolean;
    error?: string;
}

// Connection status types
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// Connection status event handler
export type ConnectionStatusHandler = (status: ConnectionStatus, message: string) => void;

/**
 * Singleton class to manage WebSocket connections to CrewAI
 */
class CrewAISocketManager {
    private static instance: CrewAISocketManager;
    private socket: Socket | null = null;
    private isConnecting: boolean = false;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private statusListeners: ConnectionStatusHandler[] = [];
    private activeRuns: Set<string> = new Set();
    private autoReconnect: boolean = true;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000; // 3 seconds

    private constructor() { }

    public static getInstance(): CrewAISocketManager {
        if (!CrewAISocketManager.instance) {
            CrewAISocketManager.instance = new CrewAISocketManager();
        }
        return CrewAISocketManager.instance;
    }

    /**
     * Get the current connection status
     */
    public getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    /**
     * Subscribe to connection status updates
     */
    public onConnectionStatus(handler: ConnectionStatusHandler): () => void {
        this.statusListeners.push(handler);
        // Immediately notify with current status
        handler(this.connectionStatus, this.getStatusMessage());

        // Return unsubscribe function
        return () => {
            this.statusListeners = this.statusListeners.filter(h => h !== handler);
        };
    }

    /**
     * Get a status message based on current state
     */
    private getStatusMessage(): string {
        switch (this.connectionStatus) {
            case 'connected':
                return 'Connected to CrewAI server';
            case 'disconnected':
                return this.reconnectAttempts > 0
                    ? `Disconnected. Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
                    : 'Disconnected from CrewAI server';
            case 'connecting':
                return 'Connecting to CrewAI server...';
            default:
                return 'Unknown connection state';
        }
    }

    /**
     * Update connection status and notify listeners
     */
    private updateStatus(status: ConnectionStatus): void {
        this.connectionStatus = status;
        const message = this.getStatusMessage();
        console.log(`[CrewAI Socket] Status: ${status} - ${message}`);

        // Notify all listeners
        this.statusListeners.forEach(handler => {
            try {
                handler(status, message);
            } catch (error) {
                console.error('[CrewAI Socket] Error in status listener:', error);
            }
        });
    }

    /**
     * Connect to the CrewAI WebSocket server
     */
    public connect(): Socket {
        if (this.socket && this.socket.connected) {
            console.log('[CrewAI Socket] Already connected');
            return this.socket;
        }

        if (this.isConnecting) {
            console.log('[CrewAI Socket] Connection already in progress');
            return this.socket!;
        }

        this.isConnecting = true;
        this.updateStatus('connecting');

        // Get the backend URL from environment variable
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

        console.log(`[CrewAI Socket] Connecting to ${backendUrl}`);

        this.socket = io(backendUrl, {
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            transports: ['websocket'],
            autoConnect: true
        });

        // Set up event handlers
        this.setupEventHandlers();

        return this.socket;
    }

    /**
     * Set up socket event handlers
     */
    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[CrewAI Socket] Connected:', this.socket?.id);
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.updateStatus('connected');

            // Rejoin any active rooms
            this.activeRuns.forEach(runId => {
                console.log(`[CrewAI Socket] Rejoining room: ${runId}`);
                this.socket?.emit('join_room', { run_id: runId });
            });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[CrewAI Socket] Disconnected:', reason);
            this.updateStatus('disconnected');

            // Auto-reconnect if needed
            if (this.autoReconnect &&
                (reason === 'io server disconnect' ||
                    reason === 'transport close' ||
                    reason === 'ping timeout')) {

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[CrewAI Socket] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    this.updateStatus('disconnected'); // Update with new attempt count

                    setTimeout(() => {
                        if (this.socket) {
                            this.socket.connect();
                            this.updateStatus('connecting');
                        }
                    }, this.reconnectDelay);
                } else {
                    console.log('[CrewAI Socket] Max reconnect attempts reached');
                }
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[CrewAI Socket] Connection error:', error);
            this.isConnecting = false;
            this.updateStatus('disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('[CrewAI Socket] Socket error:', error);
        });

        this.socket.on('joined_room', (data) => {
            console.log('[CrewAI Socket] Joined room:', data);
        });
    }

    /**
     * Disconnect from the CrewAI WebSocket server
     */
    public disconnect(): void {
        if (this.socket) {
            // Leave all rooms first
            this.activeRuns.forEach(runId => {
                this.socket?.emit('leave_room', { run_id: runId });
            });

            this.socket.disconnect();
            this.socket = null;
            this.activeRuns.clear();
            this.isConnecting = false;
            this.updateStatus('disconnected');
        }
    }

    /**
     * Get the socket instance, connecting if necessary
     */
    public getSocket(): Socket {
        if (!this.socket || !this.socket.connected) {
            return this.connect();
        }
        return this.socket;
    }

    /**
     * Join a room for a specific run ID
     */
    public joinRoom(runId: string): void {
        if (!runId) return;

        const socket = this.getSocket();
        socket.emit('join_room', { run_id: runId });
        this.activeRuns.add(runId);
        console.log(`[CrewAI Socket] Joined room: ${runId}`);
    }

    /**
     * Leave a room for a specific run ID
     */
    public leaveRoom(runId: string): void {
        if (!runId || !this.socket) return;

        this.socket.emit('leave_room', { run_id: runId });
        this.activeRuns.delete(runId);
        console.log(`[CrewAI Socket] Left room: ${runId}`);
    }
}

/**
 * Execute a task using CrewAI via WebSocket connection
 * @param taskDescription The description of the task to execute
 * @returns Promise that resolves with the task execution result
 */
export const executeTaskWithCrewAI = (
    taskDescription: string,
    onLogUpdate?: (log: CrewAILogUpdate) => void,
    onStatusChange?: ConnectionStatusHandler
): Promise<TaskExecutionResult> => {
    return new Promise((resolve, reject) => {
        // Get or create the socket manager instance
        const socketManager = CrewAISocketManager.getInstance();

        // Subscribe to connection status updates if requested
        let statusUnsubscribe: (() => void) | null = null;
        if (onStatusChange) {
            statusUnsubscribe = socketManager.onConnectionStatus(onStatusChange);
        }

        // Get the socket instance (connecting if needed)
        const socket = socketManager.getSocket();

        // Generate a new run ID for this execution
        const runId = crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(`Starting CrewAI task execution (Run ID: ${runId}) for task: ${taskDescription}`);

        // Initialize event tracking
        let hierarchyData: CrewAIAgent[] = [];
        let receivedComplete = false;

        // Handler for log update messages
        const handleLogUpdate = (data: CrewAILogUpdate) => {
            // Only process logs for our specific run
            if (data.run_id !== runId) return;

            console.log(`[CrewAI Log] ${data.log_prefix || ''}: ${data.type}`, data.data);

            // Capture hierarchy data when generated
            if (data.type === 'hierarchy_generated' && data.data?.hierarchy) {
                hierarchyData = data.data.hierarchy;
                console.log('Received agent hierarchy:', hierarchyData);
            }

            // Call the optional callback if provided
            if (onLogUpdate) {
                onLogUpdate(data);
            }
        };

        // Handler for run completion
        const handleRunComplete = (data: CrewAIRunComplete) => {
            // Only process completion for our specific run
            if (data.run_id !== runId) return;

            console.log(`[CrewAI] Run ${runId} completed with status: ${data.status}`);
            receivedComplete = true;

            // Clean up event listeners
            cleanup();

            if (data.status === 'success') {
                // Map the CrewAI result to our TaskExecutionResult format
                const result: TaskExecutionResult = {
                    runId: data.run_id,
                    taskDescription: data.final_result.task_description,
                    agentHierarchy: data.final_result.agent_hierarchy || hierarchyData,
                    finalOutput: data.final_result.final_output || '',
                    agentUsage: data.final_result.agent_token_usage || {},
                    agentChain: [], // Will be populated by the caller
                    success: true
                };

                resolve(result);
            } else {
                // Handle error case
                const result: TaskExecutionResult = {
                    runId: data.run_id,
                    taskDescription: data.final_result.task_description,
                    agentHierarchy: data.final_result.agent_hierarchy || hierarchyData,
                    finalOutput: data.final_result.final_output || '',
                    agentUsage: data.final_result.agent_token_usage || {},
                    agentChain: [], // Will be populated by the caller
                    success: false,
                    error: data.error || data.final_result.error || 'Unknown error occurred'
                };

                resolve(result);
            }
        };

        // Handler for errors
        const handleError = (error: any) => {
            console.error(`[CrewAI Socket Error] Run ${runId}:`, error);
            if (!receivedComplete) {
                cleanup();
                receivedComplete = true;
                reject(new Error(`Socket error: ${error}`));
            }
        };

        // Handler for connection errors
        const handleConnectError = (error: any) => {
            console.error(`[CrewAI Connection Error] Run ${runId}:`, error);
            if (!receivedComplete) {
                cleanup();
                receivedComplete = true;
                reject(new Error(`Connection error: ${error.message}`));
            }
        };

        // Clean up function to remove all event listeners
        const cleanup = () => {
            socket.off('log_update', handleLogUpdate);
            socket.off('run_complete', handleRunComplete);
            socket.off('error', handleError);
            socket.off('connect_error', handleConnectError);

            // Unsubscribe from status updates if needed
            if (statusUnsubscribe) {
                statusUnsubscribe();
            }

            // Leave the room for this run
            socketManager.leaveRoom(runId);
        };

        // Set up event listeners
        socket.on('log_update', handleLogUpdate);
        socket.on('run_complete', handleRunComplete);
        socket.on('error', handleError);
        socket.on('connect_error', handleConnectError);

        // Join the room for this run
        socketManager.joinRoom(runId);

        // After joining the room, init the run by making a POST request
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

        fetch(`${backendUrl}/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task_description: taskDescription })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`[CrewAI] Run initiated with ID: ${data.run_id}`);
                // Check if the returned run_id matches our expected runId
                if (data.run_id !== runId) {
                    console.warn(`Warning: Server assigned different run ID (${data.run_id}) than expected (${runId})`);
                }
            })
            .catch(error => {
                console.error(`[CrewAI] Error initiating run: ${error}`);
                if (!receivedComplete) {
                    cleanup();
                    receivedComplete = true;
                    reject(error);
                }
            });

        // Set a timeout to prevent hanging indefinitely (5 minutes)
        const timeout = setTimeout(() => {
            if (!receivedComplete) {
                console.error(`[CrewAI] Run ${runId} timed out after 5 minutes`);
                cleanup();
                receivedComplete = true;
                reject(new Error('Task execution timed out after 5 minutes'));
            }
        }, 5 * 60 * 1000);

        // Clear timeout when run completes
        socket.once('run_complete', () => {
            clearTimeout(timeout);
        });
    });
};

/**
 * Create an agent chain from the CrewAI agent hierarchy and map to local agent types
 * @param result The CrewAI task execution result
 * @param networkAgents The available agents in the network
 * @returns An array of agents to use in the visualization
 */
export const createAgentChainFromCrewAI = (
    result: TaskExecutionResult,
    networkAgents: Agent[]
): Agent[] => {
    // Start with the main agent
    const mainAgent = networkAgents.find(agent => agent.type === 'main');
    if (!mainAgent) {
        console.error('Main agent not found in network');
        return [];
    }

    const chain: Agent[] = [mainAgent];

    // Use the agent hierarchy data from CrewAI if available
    if (result.agentHierarchy && result.agentHierarchy.length > 0) {
        // Sort by level if available
        const sortedHierarchy = [...result.agentHierarchy].sort(
            (a, b) => (a.level || 0) - (b.level || 0)
        );

        // Map the CrewAI agent names to our network agents
        for (const hierarchyAgent of sortedHierarchy) {
            // Try to find a matching agent in our network
            const agent = findMatchingAgentByName(hierarchyAgent.agent_name, networkAgents);

            if (agent && !chain.includes(agent)) {
                chain.push(agent);
            }
        }
    }

    // If hierarchy didn't produce a chain with agents, add at least one agent
    if (chain.length <= 1) {
        // Add the text generator as a fallback
        const textGen = networkAgents.find(agent => agent.id === 'text-gen-1');
        if (textGen && !chain.includes(textGen)) {
            chain.push(textGen);
        }
    }

    return chain;
};

/**
 * Find a matching agent in our network based on the CrewAI agent name
 */
function findMatchingAgentByName(crewAIAgentName: string, networkAgents: Agent[]): Agent | undefined {
    // Normalize the CrewAI agent name
    const normalizedName = crewAIAgentName.replace(/_/g, ' ').toLowerCase();

    // Try direct match first
    let agent = networkAgents.find(
        node => node.name.toLowerCase() === normalizedName
    );

    if (agent) return agent;

    // Try partial match
    agent = networkAgents.find(
        node => normalizedName.includes(node.name.toLowerCase()) ||
            node.name.toLowerCase().includes(normalizedName)
    );

    if (agent) return agent;

    // Map specific agent types based on keywords
    if (normalizedName.includes('text') || normalizedName.includes('writer') || normalizedName.includes('generator')) {
        return networkAgents.find(node => node.id === 'text-gen-1');
    }

    if (normalizedName.includes('image') || normalizedName.includes('visual') || normalizedName.includes('designer')) {
        return networkAgents.find(node => node.id === 'image-gen-1');
    }

    if (normalizedName.includes('data') || normalizedName.includes('analy') || normalizedName.includes('process')) {
        return networkAgents.find(node => node.id === 'data-analyzer');
    }

    if (normalizedName.includes('research') || normalizedName.includes('search') || normalizedName.includes('find')) {
        return networkAgents.find(node => node.id === 'research-assistant');
    }

    if (normalizedName.includes('code') || normalizedName.includes('developer') || normalizedName.includes('program')) {
        return networkAgents.find(node => node.id === 'code-generator');
    }

    if (normalizedName.includes('translat') || normalizedName.includes('language')) {
        return networkAgents.find(node => node.id === 'translator');
    }

    if (normalizedName.includes('summar') || normalizedName.includes('brief')) {
        return networkAgents.find(node => node.id === 'summarizer');
    }

    // Default to text generator if no match found
    return networkAgents.find(node => node.id === 'text-gen-1');
}

// Export singleton instance for direct use
export const crewAISocketManager = CrewAISocketManager.getInstance();