/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/crossmark/client.ts
import { TransactionResponse, TransactionStatus, TransactionType } from '@/types/transaction';
import sdk from "@crossmarkio/sdk";

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
     * Check if the Crossmark wallet extension is installed.
     * Uses sdk.sync.isInstalled().
     */
    public isInstalled(): boolean {
        return sdk.sync.isInstalled() ?? false;
    }

    /**
     * Check if the wallet is connected.
     * (Connection state is tracked locally.)
     */
    public async isConnected(): Promise<boolean> {
        return this.connected && !!this.address;
    }

    /**
     * Connect to the Crossmark wallet.
     * Uses sdk.async.signInAndWait() to initiate sign‑in and obtain the wallet address.
     */
    public async connect(): Promise<string | null> {
        if (!this.isInstalled()) {
            throw new Error('Crossmark extension is not installed');
        }
        try {
            const response = await sdk.async.signInAndWait();
            if (response.response.data.address) {
                this.connected = true;
                this.address = response.response.data.address;
                return this.address;
            } else {
                this.connected = false;
                return null;
            }
        } catch (error) {
            console.error('Failed to connect to Crossmark wallet:', error);
            throw error;
        }
    }

    /**
     * Disconnect the wallet.
     * (Clears the local connection state.)
     */
    public async disconnect(): Promise<void> {
        this.connected = false;
        this.address = null;
        return;
    }

    /**
     * Get the currently connected wallet address.
     */
    public getAddress(): string | null {
        return this.address;
    }

    /**
     * Sign and submit a transaction.
     * Delegates to sdk.async.signAndWait().
     */
    public async signAndSubmitTransaction(tx: any): Promise<any> {
        try {
            return await sdk.async.signAndSubmitAndWait(tx);
        } catch (error) {
            console.error("Error during transaction signing and submission:", error);
            throw error;
        }
    }

    /**
     * Top up the balance by transferring XRP to the main agent.
     * Creates a Payment transaction, signs it, and submits it.
     */
    public async topUpBalance(mainAgentAddress: string, amount: number): Promise<TransactionResponse> {
        if (!this.connected || !this.address) {
            throw new Error('Crossmark wallet is not connected');
        }
        try {
            const payment = {
                TransactionType: "Payment",
                Account: this.address,
                Destination: mainAgentAddress,
                Amount: String(Math.floor(amount * 1000000)), // Convert XRP to drops (1 XRP = 1,000,000 drops)
                Fee: "12"
            };

            const result = await this.signAndSubmitTransaction(payment);
            // Use the meta object directly; check for isSuccess flag.
            const isSuccess = result.response.data?.meta?.isSuccess === true;

            // Optionally, also check if there is a transaction hash.
            const txHash = result.response.data?.meta?.TransactionHash || "";

            const transaction = {
                id: `crossmark-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: this.address,
                to: 'main-agent',
                amount,
                currency: 'XRP',
                timestamp: new Date().toISOString(),
                status: isSuccess ? 'confirmed' as TransactionStatus : 'failed' as TransactionStatus,
                type: 'payment' as TransactionType,
                xrpTxHash: txHash,
                ledgerIndex: result.response.data?.ledger_index, // may be undefined
                memo: 'Top up from Crossmark wallet'
            };

            return {
                transaction,
                success: isSuccess,
                ledgerResponse: result
            };

        } catch (error) {
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

}

// Export a singleton instance.
const crossmarkClient = CrossmarkClient.getInstance();
export default crossmarkClient;
