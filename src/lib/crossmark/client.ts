/* eslint-disable @typescript-eslint/no-explicit-any */
// Crossmark wallet integration client
import { TransactionResponse, TransactionStatus, TransactionType } from '@/types/transaction';

// Crossmark SDK types
interface CrossmarkSDK {
    isConnected: () => Promise<boolean>;
    connect: () => Promise<string>;
    disconnect: () => Promise<void>;
    getAddress: () => Promise<string | null>;
    getBalance: () => Promise<{ xrp: number;[key: string]: number }>;
    signAndSubmitTransaction: (tx: any) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
    interface Window {
        crossmark?: CrossmarkSDK;
    }
}

export class CrossmarkClient {
    private static instance: CrossmarkClient;
    private connected: boolean = false;
    private address: string | null = null;

    private constructor() { }

    public static getInstance(): CrossmarkClient {
        if (!CrossmarkClient.instance) {
            CrossmarkClient.instance = new CrossmarkClient();
        }
        return CrossmarkClient.instance;
    }

    /**
     * Check if Crossmark extension is installed
     */
    public isInstalled(): boolean {
        return typeof window !== 'undefined' && !!window.crossmark;
    }

    /**
     * Check if wallet is connected
     */
    public async isConnected(): Promise<boolean> {
        if (!this.isInstalled()) return false;

        try {
            this.connected = await window.crossmark!.isConnected();
            if (this.connected) {
                this.address = await window.crossmark!.getAddress();
            }
            return this.connected;
        } catch (error) {
            console.error('Failed to check Crossmark connection status:', error);
            return false;
        }
    }

    /**
     * Connect to Crossmark wallet
     */
    public async connect(): Promise<string | null> {
        if (!this.isInstalled()) {
            throw new Error('Crossmark extension is not installed');
        }

        try {
            this.address = await window.crossmark!.connect();
            this.connected = !!this.address;
            return this.address;
        } catch (error) {
            console.error('Failed to connect to Crossmark wallet:', error);
            throw error;
        }
    }

    /**
     * Disconnect from Crossmark wallet
     */
    public async disconnect(): Promise<void> {
        if (!this.isInstalled() || !this.connected) return;

        try {
            await window.crossmark!.disconnect();
            this.connected = false;
            this.address = null;
        } catch (error) {
            console.error('Failed to disconnect from Crossmark wallet:', error);
            throw error;
        }
    }

    /**
     * Get the connected wallet address
     */
    public getAddress(): string | null {
        return this.address;
    }

    /**
     * Get wallet balances
     */
    public async getBalance(): Promise<{ xrp: number;[key: string]: number }> {
        if (!this.isInstalled() || !this.connected) {
            throw new Error('Crossmark wallet is not connected');
        }

        try {
            return await window.crossmark!.getBalance();
        } catch (error) {
            console.error('Failed to get Crossmark wallet balance:', error);
            throw error;
        }
    }

    /**
     * Top up balance by transferring XRP to main agent
     */
    public async topUpBalance(
        mainAgentAddress: string,
        amount: number
    ): Promise<TransactionResponse> {
        if (!this.isInstalled() || !this.connected) {
            throw new Error('Crossmark wallet is not connected');
        }

        try {
            // Create a Payment transaction
            const payment = {
                TransactionType: "Payment",
                Account: this.address,
                Destination: mainAgentAddress,
                Amount: String(Math.floor(amount * 1000000)), // Convert to drops
                Fee: "12"
            };

            // Sign and submit the transaction using Crossmark
            const result = await window.crossmark!.signAndSubmitTransaction(payment);

            // Create a transaction record
            const transaction = {
                id: `crossmark-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: this.address || 'crossmark-wallet',
                to: 'main-agent',
                amount,
                currency: 'XRP',
                timestamp: new Date().toISOString(),
                status: result.result?.meta?.TransactionResult === 'tesSUCCESS' ? 'confirmed' : 'failed' as TransactionStatus,
                type: 'payment' as TransactionType,
                xrpTxHash: result.result?.hash || '',
                ledgerIndex: result.result?.ledger_index,
                memo: 'Top up from Crossmark wallet'
            };

            return {
                transaction,
                success: result.result?.meta?.TransactionResult === 'tesSUCCESS',
                ledgerResponse: result
            };
        } catch (error) {
            console.error('Failed to top up balance from Crossmark wallet:', error);

            // Create a failed transaction record
            const transaction = {
                id: `crossmark-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: this.address || 'crossmark-wallet',
                to: 'main-agent',
                amount,
                currency: 'XRP',
                timestamp: new Date().toISOString(),
                status: 'failed' as TransactionStatus,
                type: 'payment' as TransactionType,
                memo: 'Failed top up from Crossmark wallet'
            };

            return {
                transaction,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Subscribe to Crossmark events
     */
    public subscribeToEvents(
        onConnectChange: (connected: boolean) => void,
        onBalanceChange: (balances: { xrp: number;[key: string]: number }) => void
    ): void {
        if (!this.isInstalled()) return;

        const handleConnectionChange = async () => {
            const connected = await this.isConnected();
            onConnectChange(connected);
        };

        const handleBalanceChange = async (balances: { xrp: number;[key: string]: number }) => {
            onBalanceChange(balances);
        };

        // Set up event listeners
        window.crossmark!.on('connectionChange', handleConnectionChange);
        window.crossmark!.on('balanceChange', handleBalanceChange);
    }

    /**
     * Unsubscribe from Crossmark events
     */
    public unsubscribeFromEvents(
        onConnectChange: (connected: boolean) => void,
        onBalanceChange: (balances: { xrp: number;[key: string]: number }) => void
    ): void {
        if (!this.isInstalled()) return;

        window.crossmark!.off('connectionChange', onConnectChange);
        window.crossmark!.off('balanceChange', onBalanceChange);
    }
}

// Export singleton instance
const crossmarkClient = CrossmarkClient.getInstance();
export default crossmarkClient;