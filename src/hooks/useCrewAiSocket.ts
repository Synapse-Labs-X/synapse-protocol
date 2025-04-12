/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useCrewAiSocket.ts
import { useState, useEffect, useCallback } from 'react';
import socketService, {
    LogUpdatePayload,
    RunCompletePayload,
    FinalResult,
    LogType
} from '@/lib/utils/crewAiWebSocketService';

export interface SocketState {
    connected: boolean;
    connecting: boolean;
    error: Error | null;
    runId: string | null;
    logs: LogEntry[];
    finalResult: FinalResult | null;
    taskStatus: 'idle' | 'running' | 'completed' | 'error';
}

export interface LogEntry {
    id: string;
    type: LogType;
    message: string;
    timestamp: Date;
    data?: any;
    runId: string | null;
    logPrefix?: string;
}

interface UseCrewAiSocketProps {
    autoConnect?: boolean;
}

export const useCrewAiSocket = (props?: UseCrewAiSocketProps) => {
    const { autoConnect = true } = props || {};

    const [state, setState] = useState<SocketState>({
        connected: false,
        connecting: false,
        error: null,
        runId: null,
        logs: [],
        finalResult: null,
        taskStatus: 'idle',
    });

    // Connect to the WebSocket server
    const connect = useCallback(async () => {
        if (state.connected || state.connecting) return;

        setState(prev => ({ ...prev, connecting: true, error: null }));

        try {
            await socketService.connect({
                onConnect: () => {
                    setState(prev => ({ ...prev, connected: true, connecting: false }));
                },
                onDisconnect: (reason) => {
                    setState(prev => ({
                        ...prev,
                        connected: false,
                        error: new Error(`Disconnected: ${reason}`),
                        taskStatus: prev.taskStatus === 'running' ? 'error' : prev.taskStatus,
                    }));
                },
                onConnectError: (error) => {
                    setState(prev => ({
                        ...prev,
                        connected: false,
                        connecting: false,
                        error: error,
                    }));
                },
                onLogUpdate: (payload) => handleLogUpdate(payload),
                onRunComplete: (payload) => handleRunComplete(payload),
                onError: (error) => {
                    setState(prev => ({
                        ...prev,
                        error: typeof error === 'string' ? new Error(error) : error,
                    }));
                },
            });
        } catch (error) {
            setState(prev => ({
                ...prev,
                connecting: false,
                error: error instanceof Error ? error : new Error(String(error))
            }));
        }
    }, [state.connected, state.connecting]);

    // Disconnect from the WebSocket server
    const disconnect = useCallback(() => {
        socketService.disconnect();
        setState(prev => ({
            ...prev,
            connected: false,
            runId: null,
        }));
    }, []);

    // Start a new task
    const startTask = useCallback(async (taskDescription: string) => {
        setState(prev => ({
            ...prev,
            logs: [],
            finalResult: null,
            taskStatus: 'running',
            error: null
        }));

        try {
            if (!socketService.isConnected()) {
                await connect();
            }

            const runId = await socketService.startTask(taskDescription);

            setState(prev => ({
                ...prev,
                runId,
                taskStatus: 'running',
                logs: [
                    ...prev.logs,
                    {
                        id: `task-start-${Date.now()}`,
                        type: 'status',
                        message: `Task started with ID: ${runId}`,
                        timestamp: new Date(),
                        runId,
                    }
                ]
            }));

            return runId;
        } catch (error) {
            setState(prev => ({
                ...prev,
                taskStatus: 'error',
                error: error instanceof Error ? error : new Error(String(error)),
                logs: [
                    ...prev.logs,
                    {
                        id: `task-error-${Date.now()}`,
                        type: 'error',
                        message: `Failed to start task: ${error instanceof Error ? error.message : String(error)}`,
                        timestamp: new Date(),
                        runId: null,
                    }
                ]
            }));
            throw error;
        }
    }, [connect]);

    // Handle log updates from the server
    const handleLogUpdate = useCallback((payload: LogUpdatePayload) => {
        // console.log('Log update:', payload);
        setState(prev => {
            let message = '';

            if (typeof payload.data === 'string') {
                message = payload.data;
            } else if (payload.data && typeof payload.data === 'object') {
                if (payload.data.message) {
                    message = payload.data.message;
                } else if (payload.type === 'llm_end' && payload.data.token_usage_for_call) {
                    message = `LLM Call Finished. Tokens: ${payload.data.token_usage_for_call.total_tokens || 0}`;
                } else if (payload.type === 'agent_usage_update' && payload.data.agent_name && payload.data.cumulative_usage) {
                    const usage = payload.data.cumulative_usage;
                    message = `Usage for ${payload.data.agent_name}: Total=${usage.total_tokens}, Prompt=${usage.prompt_tokens}, Completion=${usage.completion_tokens}`;
                } else {
                    try {
                        message = JSON.stringify(payload.data);
                    } catch (e) {
                        message = 'Log data (non-stringifiable): ' + e;
                    }
                }
            } else {
                message = 'Empty log data';
            }

            const newLog: LogEntry = {
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: payload.type,
                message,
                timestamp: new Date(),
                data: payload.data,
                runId: payload.run_id,
                logPrefix: payload.log_prefix,
            };

            return {
                ...prev,
                logs: [...prev.logs, newLog],
            };
        });
    }, []);

    // Handle run complete events from the server
    const handleRunComplete = useCallback((payload: RunCompletePayload) => {
        console.log('Run complete:', payload);

        setState(prev => {
            // Add final log entry
            const newLog: LogEntry = {
                id: `run-complete-${Date.now()}`,
                type: payload.status === 'success' ? 'success' : 'error',
                message: `Run ${payload.run_id} completed with status: ${payload.status}${payload.error ? `. Error: ${payload.error}` : ''}`,
                timestamp: new Date(),
                data: payload.final_result,
                runId: payload.run_id,
            };

            return {
                ...prev,
                taskStatus: payload.status === 'success' ? 'completed' : 'error',
                finalResult: payload.final_result,
                logs: [...prev.logs, newLog],
                error: payload.error ? new Error(payload.error) : null,
            };
        });
    }, []);

    // Clear all logs and reset state
    const clearLogs = useCallback(() => {
        setState(prev => ({
            ...prev,
            logs: [],
            finalResult: null,
            taskStatus: 'idle',
            error: null,
        }));
    }, []);

    // Auto-connect on mount if requested
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        // Clean up on unmount
        return () => {
            socketService.disconnect();
        };
    }, [autoConnect, connect]);

    return {
        state,
        connect,
        disconnect,
        startTask,
        clearLogs,
        isConnected: state.connected,
    };
};