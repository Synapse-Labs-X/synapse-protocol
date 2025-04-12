// src/lib/xrp/client.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Wallet, xrpToDrops, dropsToXrp } from "xrpl";
import {
  Transaction,
  TransactionRequest,
  TransactionResponse,
} from "@/types/transaction";

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

// Wallet cache structure
interface CachedWallet {
  address: string;
  seed: string;
  publicKey: string;
  privateKey: string;
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
  private localStorageKey: string = "synapse_xrp_wallets";

  // Cache for wallet promises to avoid duplicate wallet creation
  private walletPromises: Map<string, Promise<Wallet>> = new Map();

  private constructor() {
    // XRP Testnet URL
    this.networkUrl =
      process.env.NEXT_PUBLIC_XRP_TESTNET_URL ||
      "wss://s.altnet.rippletest.net:51233";
    this.client = new Client(this.networkUrl);

    // Load wallets from cache if available
    this.loadWalletsFromCache();
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
   * Get a wallet for an agent - tries to load from cache first
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

    // Create a new wallet promise - either load from cache or create new
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
   * Get a wallet from cache or create a new one
   */
  private async getOrCreateWallet(agentId: string): Promise<Wallet> {
    // First, try to get from localStorage
    const cachedWallet = this.getWalletFromCache(agentId);

    if (cachedWallet) {
      try {
        // Create wallet from seed if available
        if (cachedWallet.seed) {
          // Try to create the wallet from seed
          const wallet = Wallet.fromSeed(cachedWallet.seed);

          // Verify the wallet is valid by checking the address
          if (wallet.address === cachedWallet.address) {
            console.log(`Loaded wallet for agent ${agentId} from cache`);
            this.wallets.set(agentId, wallet);
            return wallet;
          } else {
            console.warn(
              `Cached wallet address mismatch for ${agentId}, creating new wallet`
            );
          }
        } else {
          console.warn(`No seed available for cached wallet ${agentId}`);
        }
      } catch (error) {
        console.error(`Error loading wallet from cache for ${agentId}:`, error);
        // Fall through to creating a new wallet
      }
    }

    // If no cached wallet or error loading, create a new one
    return this.createWallet(agentId);
  }

  /**
   * Create a new wallet for an agent
   */
  public async createWallet(agentId: string): Promise<Wallet> {
    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn(
          `Could not initialize XRP client, using fallback mock wallet for ${agentId}`
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

        // Cache the wallet in localStorage
        this.cacheWallet(agentId, fundedWallet);

        console.log(
          `Created and cached new funded wallet for agent ${agentId}`
        );
        return fundedWallet;
      } catch (fundingError) {
        console.warn(
          `Failed to fund wallet for ${agentId}, using unfunded wallet:`,
          fundingError
        );

        // Still use the generated wallet even if funding failed
        this.wallets.set(agentId, wallet);
        this.cacheWallet(agentId, wallet);

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
   * Save wallet data to localStorage
   */
  private cacheWallet(agentId: string, wallet: Wallet): void {
    try {
      if (typeof window === "undefined") return; // Skip if not in browser

      // Get existing wallets from localStorage
      const cachedData = localStorage.getItem(this.localStorageKey);
      const walletCache: Record<string, CachedWallet> = cachedData
        ? JSON.parse(cachedData)
        : {};

      // Ensure we have valid data to store
      if (!wallet.address) {
        console.warn(`Cannot cache wallet for ${agentId}: Missing address`);
        return;
      }

      // Store only what we need for recreation
      const walletData: CachedWallet = {
        address: wallet.address,
        seed: wallet.seed || "",
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey || "",
      };

      // Validate data before storing
      if (!walletData.seed && !walletData.privateKey) {
        console.warn(
          `Cannot cache wallet for ${agentId}: Missing seed and privateKey`
        );
        return;
      }

      // Add the new wallet to cache
      walletCache[agentId] = walletData;

      // Save back to localStorage
      localStorage.setItem(this.localStorageKey, JSON.stringify(walletCache));
      console.log(`Successfully cached wallet for ${agentId}`);
    } catch (error) {
      console.error(`Failed to cache wallet for ${agentId}:`, error);
      // Non-critical error, we can continue without caching
    }
  }

  /**
   * Get wallet data from localStorage
   */
  private getWalletFromCache(agentId: string): CachedWallet | null {
    try {
      if (typeof window === "undefined") return null; // Skip if not in browser

      const cachedData = localStorage.getItem(this.localStorageKey);
      if (!cachedData) return null;

      const walletCache = JSON.parse(cachedData);
      return walletCache[agentId] || null;
    } catch (error) {
      console.error(`Failed to retrieve cached wallet for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Load all wallets from cache into memory
   */
  private loadWalletsFromCache(): void {
    try {
      if (typeof window === "undefined") return; // Skip if not in browser

      const cachedData = localStorage.getItem(this.localStorageKey);
      if (!cachedData) {
        console.log("No cached wallets found in localStorage");
        return;
      }

      // Safely parse JSON
      let walletCache: Record<string, CachedWallet>;
      try {
        walletCache = JSON.parse(cachedData);
        if (!walletCache || typeof walletCache !== "object") {
          console.warn("Invalid wallet cache format, skipping cache loading");
          return;
        }
      } catch (parseError) {
        console.error("Failed to parse wallet cache:", parseError);
        // If cache is corrupted, clear it
        localStorage.removeItem(this.localStorageKey);
        return;
      }

      // For each cached wallet, try to recreate the Wallet object
      let successCount = 0;
      Object.entries(walletCache).forEach(([agentId, walletData]) => {
        try {
          // Skip if missing required data
          if (!walletData || !walletData.address) {
            console.warn(
              `Skipping invalid cached wallet for ${agentId}: Missing address`
            );
            return;
          }

          let wallet: Wallet | null = null;

          // Try to create wallet from seed
          if (walletData.seed) {
            try {
              // Use the appropriate method to create wallet from seed
              wallet = Wallet.fromSeed(walletData.seed);

              // Verify the wallet address matches
              if (wallet.address === walletData.address) {
                this.wallets.set(agentId, wallet);
                successCount++;
                console.log(
                  `Successfully restored wallet for ${agentId} from cache`
                );
              } else {
                console.warn(
                  `Address mismatch for cached wallet ${agentId}: ${wallet.address} !== ${walletData.address}`
                );
              }
            } catch (seedError) {
              console.warn(
                `Failed to create wallet from seed for ${agentId}:`,
                seedError
              );
            }
          } else {
            console.warn(`No seed available for cached wallet ${agentId}`);
          }
        } catch (err) {
          console.error(`Error loading wallet for ${agentId}:`, err);
        }
      });

      console.log(`Successfully loaded ${successCount} wallets from cache`);
    } catch (error) {
      console.error("Failed to load wallets from cache:", error);
    }
  }

  /**
   * Check if a wallet is already cached for an agent
   */
  public isWalletCached(agentId: string): boolean {
    // Check in-memory cache first
    if (this.wallets.has(agentId)) return true;

    // Then check localStorage
    return this.getWalletFromCache(agentId) !== null;
  }

  /**
   * Clear a specific wallet from cache
   */
  public clearWalletFromCache(agentId: string): void {
    // Remove from in-memory cache
    this.wallets.delete(agentId);

    // Remove from localStorage
    try {
      if (typeof window === "undefined") return;

      const cachedData = localStorage.getItem(this.localStorageKey);
      if (!cachedData) return;

      const walletCache = JSON.parse(cachedData);
      delete walletCache[agentId];

      localStorage.setItem(this.localStorageKey, JSON.stringify(walletCache));
    } catch (error) {
      console.error(`Failed to clear wallet for ${agentId} from cache:`, error);
    }
  }

  /**
   * Clear all wallets from cache
   */
  public clearAllWallets(): void {
    // Clear in-memory cache
    this.wallets.clear();

    // Clear localStorage
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem(this.localStorageKey);
    } catch (error) {
      console.error("Failed to clear wallet cache:", error);
    }
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
