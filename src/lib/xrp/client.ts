// src/lib/xrp/client.ts (Updated version)
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Wallet, xrpToDrops, dropsToXrp } from "xrpl";
import {
  Transaction,
  TransactionRequest,
  TransactionResponse,
} from "@/types/transaction";
import walletKeyManager from "./walletKeyManager";

// Type definitions to handle XRPL response structures
interface XrplTransactionResult {
  result: {
    hash?: string;
    ledger_index?: number;
    meta?:
      | {
          TransactionResult?: string;
        }
      | string;
    Fee?: string;
    [key: string]: any;
  };
}

interface XrplAccountInfoResult {
  result: {
    account_data?: {
      Balance?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// XRP Client Singleton
class XrpClient {
  private static instance: XrpClient;
  public client: Client;
  private wallets: Map<string, Wallet> = new Map();
  private initialized: boolean = false;
  private initializing: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private networkUrl: string;

  // Cache for wallet promises to avoid duplicate wallet creation
  private walletPromises: Map<string, Promise<Wallet>> = new Map();

  private constructor() {
    // XRP Testnet URL
    this.networkUrl =
      process.env.NEXT_PUBLIC_XRP_TESTNET_URL ||
      "wss://s.altnet.rippletest.net:51233";
    this.client = new Client(this.networkUrl);
  }

  public static getInstance(): XrpClient {
    if (!XrpClient.instance) {
      XrpClient.instance = new XrpClient();
    }
    return XrpClient.instance;
  }

  public async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If currently initializing, wait for that promise to resolve
    if (this.initializing && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start initialization
    this.initializing = true;

    try {
      this.connectionPromise = (async () => {
        console.log("Connecting to XRP Testnet...");
        await this.client.connect();
        this.initialized = true;
        console.log("Connected to XRP Testnet");
      })();

      await this.connectionPromise;
    } catch (error) {
      console.error("Failed to connect to XRP Testnet:", error);
      throw error;
    } finally {
      this.initializing = false;
      this.connectionPromise = null;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.initialized) {
      await this.client.disconnect();
      this.initialized = false;
    }
  }

  /**
   * Get a wallet for an agent - uses the WalletKeyManager for demo wallets
   */
  public async getWallet(agentId: string): Promise<Wallet> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if we already have this wallet in memory
    let wallet = this.wallets.get(agentId);
    if (wallet) {
      return wallet;
    }

    // Check if we're already in the process of creating this wallet
    const existingPromise = this.walletPromises.get(agentId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new wallet promise
    const walletPromise = this.getOrCreateWallet(agentId);
    this.walletPromises.set(agentId, walletPromise);

    try {
      wallet = await walletPromise;
      return wallet;
    } finally {
      // Clean up promise cache after it resolves/rejects
      this.walletPromises.delete(agentId);
    }
  }

  /**
   * Get a wallet from key manager or create a new one
   */
  private async getOrCreateWallet(agentId: string): Promise<Wallet> {
    // Special case for user-wallet - create dynamically as before
    if (agentId === "user-wallet") {
      return this.createWallet(agentId);
    }

    // For all other agent wallets, use the wallet key manager
    const demoWallet = walletKeyManager.getWallet(agentId);

    if (demoWallet) {
      console.log(`Using demo wallet for agent ${agentId}`);
      this.wallets.set(agentId, demoWallet);
      return demoWallet;
    }

    // If no demo wallet is available, create a new one
    console.log(`No demo wallet found for ${agentId}, creating a new one`);
    return this.createWallet(agentId);
  }

  /**
   * Create a new wallet for an agent - only used for user wallet
   * or agents without pre-configured demo wallets
   */
  public async createWallet(agentId: string): Promise<Wallet> {
    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn(
          `Could not initialize XRP client, using fallback mock wallet for ${agentId} - error: ${error}`
        );
        return this.createMockWallet(agentId);
      }
    }

    try {
      // Try to create a real wallet
      const wallet = Wallet.generate();

      // Try to fund the wallet from testnet faucet
      try {
        const fundResult = await this.client.fundWallet(wallet);
        const fundedWallet = fundResult.wallet;

        // Store the funded wallet in memory
        this.wallets.set(agentId, fundedWallet);

        console.log(`Created new funded wallet for agent ${agentId}`);
        return fundedWallet;
      } catch (fundingError) {
        console.warn(
          `Failed to fund wallet for ${agentId}, using unfunded wallet:`,
          fundingError
        );

        // Still use the generated wallet even if funding failed
        this.wallets.set(agentId, wallet);
        return wallet;
      }
    } catch (error) {
      console.error(`Failed to create wallet for agent ${agentId}:`, error);

      // Fallback to mock wallet in case of catastrophic failure
      console.warn(`Using mock wallet for ${agentId} due to creation failure`);
      return this.createMockWallet(agentId);
    }
  }

  /**
   * Create a mock wallet for testing or when XRP network is unavailable
   * This ensures the application can still function in demo mode
   */
  private createMockWallet(agentId: string): Wallet {
    try {
      // First, try to generate a real wallet without funding
      const wallet = Wallet.generate();
      console.log(`Created mock wallet for agent ${agentId} (unfunded)`);
      return wallet;
    } catch (error) {
      console.error(
        `Failed to generate wallet for mock usage, creating minimal mock:`,
        error
      );

      // If even wallet generation fails, create a minimal mock object
      // Generate deterministic mock data based on agent ID
      const mockSeed = `s${agentId.replace(/[^a-zA-Z0-9]/g, "")}MockSeedXRPL`;
      const mockAddress = `r${agentId.replace(
        /[^a-zA-Z0-9]/g,
        ""
      )}MockAddressXRPL`;

      // Create a minimal wallet object - compatible with your XRPL version
      const mockWallet = {
        address: mockAddress,
        seed: mockSeed,
        publicKey: `${mockAddress}PUB`,
        classicAddress: mockAddress,
        sign: () => ({ tx_blob: "MOCK_SIGNED_TX" }),
      } as unknown as Wallet;

      console.log(
        `Created minimal mock wallet for agent ${agentId} (for testing/fallback)`
      );
      return mockWallet;
    }
  }

  /**
   * Check if a wallet is already cached for an agent
   */
  public isWalletCached(agentId: string): boolean {
    // Check if we have this wallet in memory
    if (this.wallets.has(agentId)) return true;

    // Or if we have a demo wallet for this agent
    return walletKeyManager.hasKeys(agentId);
  }

  /**
   * Clear a specific wallet from cache
   */
  public clearWalletFromCache(agentId: string): void {
    // Remove from in-memory cache
    this.wallets.delete(agentId);
  }

  /**
   * Clear all wallets from cache
   */
  public clearAllWallets(): void {
    // Clear in-memory cache
    this.wallets.clear();
  }

  public async sendPayment(
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { fromAgentId, toAgentId, amount, memo } = request;

    try {
      // Get wallets in parallel
      const [fromWallet, toWallet] = await Promise.all([
        this.getWallet(fromAgentId),
        this.getWallet(toAgentId),
      ]);

      // Prepare transaction
      const prepared = await this.client.autofill({
        TransactionType: "Payment",
        Account: fromWallet.address,
        Amount: xrpToDrops(amount), // Convert to drops (XRP's smallest unit)
        Destination: toWallet.address,
        Memos: memo
          ? [
              {
                Memo: {
                  MemoData: Buffer.from(memo, "utf8").toString("hex"),
                },
              },
            ]
          : undefined,
      });

      // Sign and submit transaction
      const signed = fromWallet.sign(prepared);
      const result = (await this.client.submitAndWait(
        signed.tx_blob
      )) as unknown as XrplTransactionResult;

      // Check for transaction success
      const isSuccess = this.isTransactionSuccessful(result);

      // Get transaction fee (safely)
      const fee = this.extractTransactionFee(result);

      // Create transaction record
      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: "RLUSD",
        timestamp: new Date().toISOString(),
        status: isSuccess ? "confirmed" : "failed",
        type: "payment",
        xrpTxHash: result.result.hash,
        ledgerIndex: result.result.ledger_index,
        fee: fee,
        memo: memo,
      };

      return {
        transaction,
        success: isSuccess,
        ledgerResponse: result,
      };
    } catch (error) {
      console.error("Payment failed:", error);

      // Create failed transaction record
      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: "RLUSD",
        timestamp: new Date().toISOString(),
        status: "failed",
        type: "payment",
        memo: memo,
      };

      return {
        transaction,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper method to safely extract transaction result
  private isTransactionSuccessful(result: XrplTransactionResult): boolean {
    if (!result || !result.result) return false;

    const { meta } = result.result;

    // Check if meta is an object with TransactionResult property
    if (meta && typeof meta === "object" && "TransactionResult" in meta) {
      return meta.TransactionResult === "tesSUCCESS";
    }

    return false;
  }

  // Helper method to safely extract transaction fee
  private extractTransactionFee(result: XrplTransactionResult): number {
    if (!result || !result.result || !result.result.Fee) return 0;

    try {
      return dropsToXrp(result.result.Fee);
    } catch (error) {
      console.error("Error parsing transaction fee:", error);
      return 0;
    }
  }

  // Get balance for a specific wallet address by querying account_info.
  public async getBalanceByAddress(address: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }
    try {
      const accountInfo = await this.client.request({
        command: "account_info",
        account: address,
        ledger_index: "validated",
      });
      const drops = accountInfo?.result?.account_data?.Balance;
      if (drops) {
        // Convert drops (string) to XRP
        return dropsToXrp(drops);
      }
      return 0;
    } catch (error) {
      console.error(`Failed to get balance for address ${address}:`, error);
      return 0;
    }
  }

  public async getBalance(agentId: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const wallet = await this.getWallet(agentId);
      const accountInfo = (await this.client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated",
      })) as unknown as XrplAccountInfoResult;

      if (accountInfo?.result?.account_data?.Balance) {
        try {
          // Convert from drops to XRP
          return dropsToXrp(accountInfo.result.account_data.Balance);
        } catch (error) {
          console.error("Error parsing balance:", error);
          return 0;
        }
      }
      return 0;
    } catch (error) {
      console.error(`Failed to get balance for agent ${agentId}:`, error);
      return 0;
    }
  }

  // For demo/simulation purposes
  public async simulateTransaction(
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    const { fromAgentId, toAgentId, amount, memo } = request;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create simulated transaction
    const transaction: Transaction = {
      id: `sim-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      from: fromAgentId,
      to: toAgentId,
      amount,
      currency: "RLUSD",
      timestamp: new Date().toISOString(),
      status: "confirmed",
      type: "payment",
      xrpTxHash: `simulated-hash-${Math.random()
        .toString(36)
        .substring(2, 15)}`,
      ledgerIndex: Math.floor(Math.random() * 1000000),
      memo: memo,
      fee: 0.000012, // Standard XRP transaction fee
    };

    return {
      transaction,
      success: true,
    };
  }
}

export default XrpClient;
