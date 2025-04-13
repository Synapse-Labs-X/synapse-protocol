// src/lib/xrp/walletInitService.ts (Updated version)

import XrpClient from "./client";
import { Agent } from "@/types/agent";
import walletKeyManager from "./walletKeyManager";

interface WalletInitProgress {
  initialized: string[];
  pending: string[];
  failed: string[];
  progress: number;
  cached: string[]; // New field to track which wallets were loaded from cache
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
    cached: [],
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
      cached: [],
      progress: 0,
    };

    try {
      // First connect to the XRP Ledger
      await this.client.initialize();

      // Check which wallets are already cached
      const cachedAgents = agents.filter((agent) =>
        this.client.isWalletCached(agent.id)
      );

      // Set the cached agents
      this.initProgress.cached = cachedAgents.map((agent) => agent.id);

      // Mark cached agents as initialized immediately
      for (const agent of cachedAgents) {
        const index = this.initProgress.pending.indexOf(agent.id);
        if (index !== -1) {
          this.initProgress.pending.splice(index, 1);
          this.initProgress.initialized.push(agent.id);
        }
      }

      // Update progress
      this.updateProgress(agents.length);

      // Process remaining non-cached agents
      const remainingAgents = agents.filter(
        (agent) => !this.initProgress.cached.includes(agent.id)
      );

      // Process all remaining agents in parallel
      const initPromises = remainingAgents.map(async (agent) => {
        try {
          // Get or create wallet for agent
          const wallet = await this.client.getWallet(agent.id);

          // Track successful initialization
          return {
            success: true,
            agentId: agent.id,
            wallet,
            cached: false,
          };
        } catch (error) {
          console.error(`Failed to initialize wallet for ${agent.id}:`, error);

          // Track failed initialization
          return {
            success: false,
            agentId: agent.id,
            error,
            cached: false,
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
            `Initialized wallet for ${result.agentId}: ${
              result.wallet?.address
            }${result.cached ? " (from cache)" : ""}`
          );
        } else {
          this.initProgress.failed.push(result.agentId);
        }

        // Update progress
        this.updateProgress(agents.length);
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
   * Update the progress percentage
   */
  private updateProgress(totalAgents: number): void {
    this.initProgress.progress = Math.round(
      (this.initProgress.initialized.length / totalAgents) * 100
    );
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
   * Clear all wallet caches - useful for testing or resetting
   */
  public clearWalletCaches(): void {
    this.client.clearAllWallets();
  }

  /**
   * Clear a specific wallet from cache
   */
  public clearWalletFromCache(agentId: string): void {
    this.client.clearWalletFromCache(agentId);
  }
}

// Export a singleton instance
const walletInitService = new WalletInitService();
export default walletInitService;
