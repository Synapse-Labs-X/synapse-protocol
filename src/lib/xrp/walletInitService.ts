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

      // Process agents in batches to avoid overwhelming the network
      const batchSize = 3;
      const batches = this.chunkArray(agents, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        // Process each batch in parallel
        await Promise.all(
          batch.map(async (agent) => {
            try {
              // Get or create wallet for agent
              const wallet = await this.client.getWallet(agent.id);

              // Move from pending to initialized
              this.initProgress.pending = this.initProgress.pending.filter(
                (id) => id !== agent.id
              );
              this.initProgress.initialized.push(agent.id);

              console.log(
                `Initialized wallet for ${agent.id}: ${wallet.address}`
              );
            } catch (error) {
              console.error(
                `Failed to initialize wallet for ${agent.id}:`,
                error
              );

              // Move from pending to failed
              this.initProgress.pending = this.initProgress.pending.filter(
                (id) => id !== agent.id
              );
              this.initProgress.failed.push(agent.id);
            }
          })
        );

        // Update progress after each batch
        this.initProgress.progress = Math.round(
          (this.initProgress.initialized.length / agents.length) * 100
        );
      }

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
   * Create a trustline for a batch of agents
   * @param agentIds List of agent IDs to create trustlines for
   * @param limit Trust limit amount
   */
  public async createTrustlinesForAgents(
    agentIds: string[],
    limit: number = 1000000
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Process agents in batches to avoid overwhelming the network
    const batchSize = 3;
    const batches = this.chunkArray(agentIds, batchSize);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (agentId) => {
          try {
            // Get the agent's wallet
            const wallet = await this.client.getWallet(agentId);

            // Create trustline transaction using the same method from transactionService
            // This is a simplified version - in production code you would refactor to avoid duplication
            const trustlineCreated = await this.createTrustline(agentId, limit);
            results[agentId] = trustlineCreated;

            console.log(
              `Trustline ${
                trustlineCreated ? "created" : "failed"
              } for ${agentId}`
            );
          } catch (error) {
            console.error(`Error creating trustline for ${agentId}:`, error);
            results[agentId] = false;
          }
        })
      );
    }

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
