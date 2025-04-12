import { TransactionRequest, TransactionResponse } from "@/types/transaction";
import XrpClient from "./client";

// RLUSD currency code in hex format
const RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";

/**
 * Service that handles real transactions on the XRP Ledger
 */
class TransactionService {
  private client: XrpClient;
  private initialized = false;

  // Track pre-initialized wallets
  private preInitializedWallets: Set<string> = new Set();

  // Wallet seeds for demonstration purposes (in a real app, these would be securely stored)
  private agentWallets: Record<string, string> = {
    "main-agent": "sEd71CfChR48xigRKg5AJcarEcgFMPk",
    "text-gen-1": "sEdTPuSbzxXuUdCbBTihdyysn7oAurh",
    "image-gen-1": "sEdTGUPzD5eykfGC4rN9SogFX9Z9Z3q",
    "data-analyzer": "sEdSLxAFzKTXpiUEMiMucdivsXLFrZr",
    "research-assistant": "sEdSrRmZ9H2PXF7Hbbn81H1zNBBVzrK",
    "code-generator": "sEdV94H2PKs5Wddjf9ypVXxPZsitL16",
    translator: "sEdVKpU8JC3LKqC2ZZpXp5hV8jV26U5",
    summarizer: "sEdSXQ54jLXHtRZnKxRLvAxJr5R5mzM",
  };

  // Agent address cache
  private agentAddresses: Record<string, string> = {};

  constructor() {
    this.client = XrpClient.getInstance();
  }

  /**
   * Initialize the transaction service
   */
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.client.initialize();
      this.initialized = true;

      console.log("Transaction service initialized");
    }
  }

  /**
   * Mark agent wallets as pre-initialized
   * @param agentIds List of agent IDs that have been pre-initialized
   */
  public markWalletsAsInitialized(agentIds: string[]): void {
    agentIds.forEach((id) => this.preInitializedWallets.add(id));
    console.log(`Marked ${agentIds.length} wallets as pre-initialized`);
  }

  /**
   * Execute a real transaction between agents
   */
  public async executeTransaction(
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      fromAgentId,
      toAgentId,
      amount,
      currency = "RLUSD",
      memo,
    } = request;

    // Check if we should use simulation or real transaction
    const useSimulation = process.env.NEXT_PUBLIC_USE_SIMULATION === "true";
    if (useSimulation) {
      console.log("Using simulated transaction");
      return this.client.simulateTransaction(request);
    }

    try {
      // If currency is RLUSD, send RLUSD token
      if (currency === "RLUSD") {
        return await this.sendRlusdPayment(
          fromAgentId,
          toAgentId,
          amount,
          memo
        );
      } else {
        // Otherwise, send XRP
        return await this.sendXrpPayment(fromAgentId, toAgentId, amount, memo);
      }
    } catch (error) {
      console.error("Transaction execution failed:", error);
      throw error;
    }
  }

  /**
   * Send RLUSD payment between agents
   */
  private async sendRlusdPayment(
    fromAgentId: string,
    toAgentId: string,
    amount: number,
    memo?: string
  ): Promise<TransactionResponse> {
    // Prepare the transaction request
    const request: TransactionRequest = {
      fromAgentId,
      toAgentId,
      amount,
      currency: "RLUSD",
      memo: memo || `Payment from ${fromAgentId} to ${toAgentId} for services`,
    };

    // Check if wallets are pre-initialized for faster processing
    const fromInitialized = this.preInitializedWallets.has(fromAgentId);
    const toInitialized = this.preInitializedWallets.has(toAgentId);

    if (fromInitialized && toInitialized) {
      console.log(
        `Using pre-initialized wallets for transaction from ${fromAgentId} to ${toAgentId}`
      );
      // This can be faster since we know the wallets are already created
    } else {
      console.log(
        `Wallets not pre-initialized for transaction from ${fromAgentId} to ${toAgentId}`
      );
      // This path will be slower as we need to initialize wallets first
    }

    // Execute the transaction (uses xrpl.js under the hood)
    return await this.client.sendPayment(request);
  }

  /**
   * Send XRP payment between agents
   */
  private async sendXrpPayment(
    fromAgentId: string,
    toAgentId: string,
    amount: number,
    memo?: string
  ): Promise<TransactionResponse> {
    // Prepare the transaction request
    const request: TransactionRequest = {
      fromAgentId,
      toAgentId,
      amount,
      currency: "XRP",
      memo: memo || `Payment from ${fromAgentId} to ${toAgentId} for services`,
    };

    // Check if wallets are pre-initialized for faster processing
    const fromInitialized = this.preInitializedWallets.has(fromAgentId);
    const toInitialized = this.preInitializedWallets.has(toAgentId);

    if (fromInitialized && toInitialized) {
      console.log(
        `Using pre-initialized wallets for transaction from ${fromAgentId} to ${toAgentId}`
      );
      // This can be faster since we know the wallets are already created
    } else {
      console.log(
        `Wallets not pre-initialized for transaction from ${fromAgentId} to ${toAgentId}`
      );
      // This path will be slower as we need to initialize wallets first
    }

    // Execute the transaction
    return await this.client.sendPayment(request);
  }

  /**
   * Create a trustline for an agent to trust RLUSD
   */
  public async createTrustline(
    agentId: string,
    limit: number = 1000000
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get the agent's wallet
      const wallet = await this.client.getWallet(agentId);

      // Create a trustline transaction
      const transaction = {
        TransactionType: "TrustSet" as const,
        Account: wallet.address,
        LimitAmount: {
          currency: RLUSD_CURRENCY_HEX,
          issuer: RLUSD_ISSUER,
          value: limit.toString(),
        },
      };

      // Prepare and sign the transaction
      const prepared = await this.client.client.autofill(transaction);
      const signed = wallet.sign(prepared);

      // Submit the transaction
      const result = await this.client.client.submitAndWait(signed.tx_blob);

      // Check if successful
      const success = !!(
        result.result.meta &&
        typeof result.result.meta === "object" &&
        "TransactionResult" in result.result.meta &&
        result.result.meta.TransactionResult === "tesSUCCESS"
      );

      if (success) {
        console.log(`Trustline created for ${agentId} to trust RLUSD`);

        // Mark this wallet as pre-initialized
        this.preInitializedWallets.add(agentId);
      } else {
        console.error(`Failed to create trustline for ${agentId}:`, result);
      }

      return success;
    } catch (error) {
      console.error(`Error creating trustline for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Get agent balance in RLUSD or XRP
   */
  public async getAgentBalance(
    agentId: string,
    currency: "RLUSD" | "XRP" = "RLUSD"
  ): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (currency === "XRP") {
      return await this.client.getBalance(agentId);
    } else {
      // For RLUSD, we need to fetch the trustline balance
      // This requires more complex code not included in this example
      // For demo purposes, we'll return a simulated value
      return 100; // Mock value
    }
  }
}

// Export a singleton instance
const transactionService = new TransactionService();
export default transactionService;
