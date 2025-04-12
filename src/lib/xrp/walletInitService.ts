import XrpClient from "./client";
import { Agent } from "@/types/agent";

interface WalletInitProgress {
  initialized: string[];
  pending: string[];
  failed: string[];
  progress: number;
}

/**
 * Service for pre-initializing all agent wallets during application startup
 */
class WalletInitService {
  private client: XrpClient;
  private isInitializing: boolean = false;
  private initProgress: WalletInitProgress = {
    initialized: [],
    pending: [],
    failed: [],
    progress: 0,
  };

  constructor() {
    this.client = XrpClient.getInstance();

    // Pre-initialize XRP client connection at service creation time
    this.client.initialize().catch((err) => {
      console.error("Failed to pre-initialize XRP client connection:", err);
    });
  }

  /**
   * Initialize wallets for all agents in parallel
   * @param agents List of agents to initialize wallets for
   * @returns Promise that resolves when all wallets are initialized
   */
  public async initializeAllWallets(
    agents: Agent[]
  ): Promise<WalletInitProgress> {
    if (this.isInitializing) {
      return this.initProgress;
    }

    this.isInitializing = true;
    this.initProgress = {
      initialized: [],
      pending: agents.map((agent) => agent.id),
      failed: [],
      progress: 0,
    };

    try {
      // First connect to the XRP Ledger
      await this.client.initialize();

      // Process all agents truly in parallel - no batching
      const initPromises = agents.map(async (agent) => {
        try {
          // Get or create wallet for agent
          const wallet = await this.client.getWallet(agent.id);

          // Track successful initialization
          return {
            success: true,
            agentId: agent.id,
            wallet,
          };
        } catch (error) {
          console.error(`Failed to initialize wallet for ${agent.id}:`, error);

          // Track failed initialization
          return {
            success: false,
            agentId: agent.id,
            error,
          };
        }
      });

      // Execute all wallet initializations concurrently
      const results = await Promise.all(initPromises);

      // Process results
      for (const result of results) {
        // Remove from pending
        this.initProgress.pending = this.initProgress.pending.filter(
          (id) => id !== result.agentId
        );

        if (result.success) {
          this.initProgress.initialized.push(result.agentId);
          console.log(
            `Initialized wallet for ${result.agentId}: ${result.wallet?.address}`
          );
        } else {
          this.initProgress.failed.push(result.agentId);
        }
      }

      // Update final progress
      this.initProgress.progress = Math.round(
        (this.initProgress.initialized.length / agents.length) * 100
      );

      return this.initProgress;
    } catch (error) {
      console.error("Failed to initialize agent wallets:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get current initialization progress
   */
  public getInitializationProgress(): WalletInitProgress {
    return this.initProgress;
  }

  /**
   * Check if wallets are being initialized
   */
  public isInitializationInProgress(): boolean {
    return this.isInitializing;
  }

  /**
   * Create a trustline for all agents in parallel
   * @param agentIds List of agent IDs to create trustlines for
   * @param limit Trust limit amount
   */
  public async createTrustlinesForAgents(
    agentIds: string[],
    limit: number = 1000000
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Process all trustlines in parallel
    const trustlinePromises = agentIds.map(async (agentId) => {
      try {
        // Create trustline transaction
        const trustlineCreated = await this.createTrustline(agentId, limit);

        console.log(
          `Trustline ${trustlineCreated ? "created" : "failed"} for ${agentId}`
        );
        return { agentId, success: trustlineCreated };
      } catch (error) {
        console.error(`Error creating trustline for ${agentId}:`, error);
        return { agentId, success: false };
      }
    });

    // Wait for all trustlines to be processed
    const trustlineResults = await Promise.all(trustlinePromises);

    // Compile results
    trustlineResults.forEach((result) => {
      results[result.agentId] = result.success;
    });

    return results;
  }

  /**
   * Create a trustline for an agent to trust RLUSD
   * Temporary duplicate from transactionService - in production you would refactor
   */
  private async createTrustline(
    agentId: string,
    limit: number = 1000000
  ): Promise<boolean> {
    // RLUSD currency code in hex format
    const RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000";
    const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";

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

      return success;
    } catch (error) {
      console.error(`Error creating trustline for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export a singleton instance
const walletInitService = new WalletInitService();
export default walletInitService;
