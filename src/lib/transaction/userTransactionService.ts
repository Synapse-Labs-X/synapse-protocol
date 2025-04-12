/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transaction } from "@/types/transaction";
import XrpClient from "@/lib/xrp/client";

interface UserTransactionRequest {
    fromAddress: string;
    toAddress: string;
    amount: number;
    currency?: string;
    memo?: string;
}

interface UserTransactionResponse {
    transaction: Transaction;
    success: boolean;
    error?: string;
    ledgerResponse?: any;
}

/**
 * Service for handling user-to-website transactions from external wallets
 */
class UserTransactionService {
    private client: XrpClient;
    private initialized = false;
    private mainWalletAddress: string;

    constructor() {
        this.client = XrpClient.getInstance();
        // Get the main wallet address from environment or config
        this.mainWalletAddress = process.env.NEXT_PUBLIC_MAIN_WALLET_ADDRESS || "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
    }

    /**
     * Initialize the transaction service
     */
    public async initialize(): Promise<void> {
        if (!this.initialized) {
            await this.client.initialize();
            this.initialized = true;
            console.log("User transaction service initialized");
        }
    }

    /**
     * Process a transaction from an external user wallet
     */
    public async processUserTransaction(
        request: UserTransactionRequest
    ): Promise<UserTransactionResponse> {
        if (!this.initialized) {
            await this.initialize();
        }

        const { fromAddress, toAddress, amount, currency = "XRP", memo } = request;

        try {
            // Verify destination address
            if (toAddress !== this.mainWalletAddress) {
                throw new Error("Invalid destination wallet address");
            }

            // For demonstration, we're skipping the actual transaction submission
            // since it would be handled by the user's wallet directly
            // Instead, we'll create a transaction record based on the provided data

            // Create transaction record
            const transaction: Transaction = {
                id: `user-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: "external-user", // You could store the user's address here
                to: "main-agent",
                amount,
                currency: currency,
                timestamp: new Date().toISOString(),
                status: "confirmed", // In a real implementation, you'd verify this
                type: "payment",
                xrpTxHash: request.fromAddress, // In a real implementation, this would be the actual tx hash
                memo: memo || "User deposit",
            };

            return {
                transaction,
                success: true,
            };
        } catch (error) {
            console.error("User transaction processing failed:", error);

            // Create failed transaction record
            const transaction: Transaction = {
                id: `failed-user-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                from: "external-user",
                to: "main-agent",
                amount,
                currency: currency,
                timestamp: new Date().toISOString(),
                status: "failed",
                type: "payment",
                memo: memo || "Failed user deposit",
            };

            return {
                transaction,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Verify a transaction on the XRP Ledger
     * This can be used to confirm that a transaction reported by the user actually occurred
     */
    public async verifyTransaction(txHash: string): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Request transaction details from the ledger
            const txResponse = await this.client.client.request({
                command: "tx",
                transaction: txHash,
            });

            // The XRP Ledger API response structure might vary between versions
            // We need to handle the response carefully to avoid TypeScript errors

            // Check if we have a valid result
            if (!txResponse?.result) {
                return false;
            }

            // Since the XRPL library types don't match exactly with the actual response structure,
            // we need to use a more dynamic approach to access the properties we need
            const txResult = txResponse.result;

            // Access transaction type - using optional chaining and type assertion
            const txJson = (txResult as any).tx_json || txResult;
            const transactionType = txJson.TransactionType;
            const destination = txJson.Destination;

            // Check if this is a Payment transaction to our main wallet
            if (transactionType === "Payment" && destination === this.mainWalletAddress) {
                // Check transaction result using a safer approach
                const meta = txResult.meta;

                if (meta && typeof meta === "object") {
                    // The TransactionResult property might be accessed differently depending on the API version
                    const transactionResult = (meta as any).TransactionResult ||
                        (meta as any).transaction_result ||
                        (meta as any).result;

                    return transactionResult === "tesSUCCESS";
                }
            }

            return false;
        } catch (error) {
            console.error("Failed to verify transaction:", error);
            return false;
        }
    }

    /**
     * Get the main wallet address
     */
    public getMainWalletAddress(): string {
        return this.mainWalletAddress;
    }
}

// Export a singleton instance
const userTransactionService = new UserTransactionService();
export default userTransactionService;