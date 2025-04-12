/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/utils/crewAiWebSocketService.ts
import { io, Socket } from "socket.io-client";

// Define event types for better type safety
export type LogType =
    | "status"
    | "error"
    | "warning"
    | "llm_start"
    | "llm_end"
    | "task_start"
    | "task_end"
    | "agent_created"
    | "agent_usage_update"
    | "hierarchy_generated"
    | "success";

export interface LogUpdatePayload {
    type: LogType;
    run_id: string;
    log_prefix?: string;
    data: any;
}

export interface RunCompletePayload {
    run_id: string;
    status: "success" | "error";
    error?: string;
    final_result: any;
}

interface AgentHierarchy {
    agent_name: string;
    description: string;
    level: number;
    cost_per_million: number;
    tokens: number;
}

export interface FinalResult {
    run_id: string;
    task_description: string;
    agent_hierarchy: AgentHierarchy[];
    final_output: string;
    task_flow: any[];
    usage_metrics: any;
    agent_token_usage: Record<string, any>;
    error: string | null;
}

// Define event handlers for Socket.IO
export interface SocketEventHandlers {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onConnectError?: (error: Error) => void;
    onLogUpdate?: (payload: LogUpdatePayload) => void;
    onRunComplete?: (payload: RunCompletePayload) => void;
    onError?: (error: any) => void;
    onJoinedRoom?: (data: any) => void;
    onLeftRoom?: (data: any) => void;
}

// Singleton class for WebSocket connection
class CrewAiWebSocketService {
    private static instance: CrewAiWebSocketService;
    private socket: Socket | null = null;
    private currentRunId: string | null = null;
    private eventHandlers: SocketEventHandlers = {};
    private isConnecting: boolean = false;
    private connectedState: boolean = false;
    private url: string;
    private reconnectAttempts: number = 5;

    private constructor() {
        this.url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        console.log(`[CrewAI Socket] Service initialized with URL: ${this.url}`);
    }

    public static getInstance(): CrewAiWebSocketService {
        if (!CrewAiWebSocketService.instance) {
            CrewAiWebSocketService.instance = new CrewAiWebSocketService();
        }
        return CrewAiWebSocketService.instance;
    }

    /**
     * Initialize the connection to the WebSocket server
     * @param handlers Event handlers for Socket.IO events
     * @returns A promise that resolves when connected or rejects on error
     */
    public connect(handlers?: SocketEventHandlers): Promise<boolean> {
        if (handlers) {
            this.eventHandlers = { ...this.eventHandlers, ...handlers };
        }

        // If already connected, resolve immediately
        if (this.socket && this.socket.connected) {
            console.log("[CrewAI Socket] Already connected");
            return Promise.resolve(true);
        }

        // If already connecting, return the current promise
        if (this.isConnecting) {
            console.log("[CrewAI Socket] Connection already in progress");
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (this.connectedState) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                    if (!this.isConnecting && !this.connectedState) {
                        clearInterval(checkInterval);
                        reject(new Error("Connection failed"));
                    }
                }, 100);
            });
        }

        this.isConnecting = true;
        console.log(`[CrewAI Socket] Connecting to ${this.url}`);

        return new Promise((resolve, reject) => {
            try {
                // If we have an existing socket, disconnect it
                if (this.socket) {
                    this.socket.disconnect();
                    this.socket = null;
                }

                // Create a new socket connection
                this.socket = io(this.url, {
                    reconnectionAttempts: this.reconnectAttempts,
                    transports: ["websocket"],
                    autoConnect: true,
                });

                // Set up event listeners
                this.socket.on("connect", () => {
                    console.log(`[CrewAI Socket] Connected with ID: ${this.socket?.id}`);
                    this.isConnecting = false;
                    this.connectedState = true;

                    // If we have a current run ID, join the room
                    if (this.currentRunId) {
                        this.joinRoom(this.currentRunId);
                    }

                    if (this.eventHandlers.onConnect) {
                        this.eventHandlers.onConnect();
                    }
                    resolve(true);
                });

                this.socket.on("disconnect", (reason) => {
                    console.log(`[CrewAI Socket] Disconnected: ${reason}`);
                    this.connectedState = false;
                    if (this.eventHandlers.onDisconnect) {
                        this.eventHandlers.onDisconnect(reason);
                    }
                });

                this.socket.on("connect_error", (error) => {
                    console.error(`[CrewAI Socket] Connection error: ${error.message}`);
                    this.isConnecting = false;
                    this.connectedState = false;
                    if (this.eventHandlers.onConnectError) {
                        this.eventHandlers.onConnectError(error);
                    }
                    reject(error);
                });

                // Set up message handlers
                this.setupMessageHandlers();

                // Set a timeout for the connection
                const timeout = setTimeout(() => {
                    if (!this.connectedState) {
                        this.isConnecting = false;
                        console.error("[CrewAI Socket] Connection timeout");
                        reject(new Error("Connection timeout"));
                    }
                }, 100000);

                // Clear the timeout if connected
                this.socket.on("connect", () => {
                    clearTimeout(timeout);
                });
            } catch (error) {
                this.isConnecting = false;
                console.error(`[CrewAI Socket] Error initializing socket: ${error}`);
                reject(error);
            }
        });
    }

    /**
     * Disconnect from the WebSocket server
     */
    public disconnect(): void {
        if (this.socket) {
            console.log("[CrewAI Socket] Disconnecting");
            if (this.currentRunId) {
                this.leaveRoom(this.currentRunId);
            }
            this.socket.disconnect();
            this.socket = null;
            this.connectedState = false;
            this.currentRunId = null;
        }
    }

    /**
     * Join a specific run ID room to receive updates
     * @param runId The run ID to join
     */
    public joinRoom(runId: string): void {
        if (!this.socket || !this.socket.connected) {
            console.warn("[CrewAI Socket] Cannot join room: Not connected");
            this.currentRunId = runId; // Save for when we connect
            return;
        }

        console.log(`[CrewAI Socket] Joining room: ${runId}`);
        this.currentRunId = runId;
        this.socket.emit("join_room", { run_id: runId });
    }

    /**
     * Leave a specific run ID room
     * @param runId The run ID to leave
     */
    public leaveRoom(runId: string): void {
        if (!this.socket || !this.socket.connected) {
            console.warn("[CrewAI Socket] Cannot leave room: Not connected");
            return;
        }

        console.log(`[CrewAI Socket] Leaving room: ${runId}`);
        this.socket.emit("leave_room", { run_id: runId });
        if (this.currentRunId === runId) {
            this.currentRunId = null;
        }
    }

    /**
     * Check if the socket is connected
     * @returns True if connected, false otherwise
     */
    public isConnected(): boolean {
        return !!(this.socket && this.socket.connected);
    }

    /**
     * Get the current run ID
     * @returns The current run ID or null if none
     */
    public getCurrentRunId(): string | null {
        return this.currentRunId;
    }

    /**
     * Start a new CrewAI task
     * @param taskDescription The task description to run
     * @returns A promise that resolves with the run ID
     */
    public async startTask(taskDescription: string): Promise<string> {
        // Make sure we're connected
        if (!this.isConnected()) {
            await this.connect();
        }

        // Leave any existing room
        if (this.currentRunId) {
            this.leaveRoom(this.currentRunId);
        }

        // Make the API request to start the task
        try {
            const response = await fetch(`${this.url}/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({ task_description: taskDescription }),
            });

            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorMsg = `Server Error (${response.status}): ${errorResult.error || JSON.stringify(errorResult)
                        }`;
                } catch (e) {
                    errorMsg = `HTTP error ${response.status}: ${response.statusText || "Failed to get error details: " + e
                        }`;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();

            if (!result.run_id) {
                throw new Error("Server did not return a run_id");
            }

            // Join the room for this run
            this.joinRoom(result.run_id);
            console.log(`[CrewAI] Run initiated with ID: ${result.run_id}`);

            // Check if there's a mismatch between expected and received run IDs
            if (this.currentRunId && this.currentRunId !== result.run_id) {
                console.warn(`Warning: Server assigned different run ID (${result.run_id}) than expected (${this.currentRunId})`);
                // We'll use the server-assigned ID
                this.currentRunId = result.run_id;
            }

            return result.run_id;
        } catch (error) {
            console.error(`[CrewAI Socket] Error starting task: ${error}`);
            throw error;
        }
    }

    /**
     * Set up handlers for all Socket.IO message types
     */
    private setupMessageHandlers(): void {
        if (!this.socket) return;

        this.socket.on("log_update", (payload: LogUpdatePayload) => {
            // console.log("[CrewAI Socket] Log update:", payload);
            if (this.eventHandlers.onLogUpdate) {
                this.eventHandlers.onLogUpdate(payload);
            }
        });

        this.socket.on("run_complete", (payload: RunCompletePayload) => {
            console.log("[CrewAI Socket] Run complete:", payload);
            if (this.eventHandlers.onRunComplete) {
                this.eventHandlers.onRunComplete(payload);
            }
        });

        this.socket.on("error", (error: any) => {
            console.error("[CrewAI Socket] Error:", error);
            if (this.eventHandlers.onError) {
                this.eventHandlers.onError(error);
            }
        });

        this.socket.on("joined_room", (data: any) => {
            console.log("[CrewAI Socket] Joined room:", data);
            if (this.eventHandlers.onJoinedRoom) {
                this.eventHandlers.onJoinedRoom(data);
            }
        });

        this.socket.on("left_room", (data: any) => {
            console.log("[CrewAI Socket] Left room:", data);
            if (this.eventHandlers.onLeftRoom) {
                this.eventHandlers.onLeftRoom(data);
            }
        });
    }

    /**
     * Update event handlers
     * @param handlers New event handlers to use
     */
    public updateEventHandlers(handlers: Partial<SocketEventHandlers>): void {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
    }
}

// Export the singleton instance
const socketService = CrewAiWebSocketService.getInstance();
export default socketService;