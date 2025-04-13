// src/lib/balance/balanceService.ts
import { Agent } from '@/types/agent';

/**
 * Balance service to manage state of agent balances
 */
class BalanceService {
    private mainBalance: number = 100; // Default starting balance (higher)
    private agentBalances: Record<string, number> = {};
    private totalVolume: number = 0;
    private subscribers: (() => void)[] = [];

    // Initialize balance service with default values
    constructor() {
        // Try to load from local storage if available in browser environment
        if (typeof window !== 'undefined') {
            try {
                const savedMainBalance = localStorage.getItem('mainBalance');
                const savedAgentBalances = localStorage.getItem('agentBalances');
                const savedTotalVolume = localStorage.getItem('totalVolume');

                if (savedMainBalance) this.mainBalance = parseFloat(savedMainBalance);
                if (savedAgentBalances) this.agentBalances = JSON.parse(savedAgentBalances);
                if (savedTotalVolume) this.totalVolume = parseFloat(savedTotalVolume);
            } catch (error) {
                console.error('Failed to load balances from local storage:', error);
            }
        }
    }

    // Initialize agent balances when agents are loaded
    initializeAgentBalances(agents: Agent[]): void {
        // Only initialize agents that don't already have a balance set
        agents.forEach((agent) => {
            if (agent.id === 'main-agent' && this.mainBalance === undefined) {
                // Initialize main agent with a higher starting balance
                this.mainBalance = agent.balance || 100;
            } else if (agent.id !== 'main-agent' && this.agentBalances[agent.id] === undefined) {
                // Initialize with default value or agent's starting balance (typically 0)
                this.agentBalances[agent.id] = agent.balance || 0;
            }
        });

        // Notify subscribers
        this.notifySubscribers();

        // Save to localStorage
        this.saveToStorage();
    }

    // Get main agent balance
    getMainBalance(): number {
        return this.mainBalance;
    }

    // Get balance for a specific agent
    getAgentBalance(agentId: string): number | undefined {
        return this.agentBalances[agentId];
    }

    // Get all agent balances
    getAllAgentBalances(): Record<string, number> {
        return { ...this.agentBalances };
    }

    // Get total transaction volume
    getTotalTransactionVolume(): number {
        return this.totalVolume;
    }

    // Update main balance
    updateMainBalance(amount: number): void {
        this.mainBalance += amount;
        this.notifySubscribers();
        this.saveToStorage();
    }

    // Update a specific agent's balance
    updateAgentBalance(agentId: string, newBalance: number): void {
        this.agentBalances[agentId] = newBalance;
        this.notifySubscribers();
        this.saveToStorage();
    }

    // Increment total transaction volume
    updateTotalVolume(amount: number): void {
        this.totalVolume += amount;
        this.notifySubscribers();
        this.saveToStorage();
    }

    // Subscribe to balance changes
    subscribe(callback: () => void): void {
        this.subscribers.push(callback);
    }

    // Unsubscribe from balance changes
    unsubscribe(callback: () => void): void {
        this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    }

    // Notify all subscribers
    private notifySubscribers(): void {
        this.subscribers.forEach((callback) => callback());
    }

    // Save current state to localStorage
    private saveToStorage(): void {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('mainBalance', this.mainBalance.toString());
                localStorage.setItem('agentBalances', JSON.stringify(this.agentBalances));
                localStorage.setItem('totalVolume', this.totalVolume.toString());
            } catch (error) {
                console.error('Failed to save balances to local storage:', error);
            }
        }
    }
}

// Create singleton instance
const balanceService = new BalanceService();

export default balanceService;