// src/lib/wallet/walletService.ts

import { Transaction, TransactionResponse } from "@/types/transaction";

/**
 * Service for handling user wallet interactions with Crossmark
 */
class WalletService {
  private static instance: WalletService;
  private mainWalletAddress: string;
  private initialized: boolean = false;
  private sdk: any = null;

  private constructor() {
    // Get the main wallet address from environment or config
    this.mainWalletAddress =
      process.env.NEXT_PUBLIC_MAIN_WALLET_ADDRESS ||
      "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Initialize the wallet service - loads the Crossmark SDK
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamically import the Crossmark SDK to avoid SSR issues
      if (typeof window !== "undefined") {
        const crossmarkSDK = await import("@crossmarkio/sdk");
        this.sdk = crossmarkSDK.default;

        // Add a small delay to ensure the SDK is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 200));

        this.initialized = true;
        console.log("Wallet service initialized with Crossmark SDK", this.sdk);

        // Check if we can detect the extension
        const installed = this.sdk?.sync?.isInstalled();
        console.log("Crossmark installed:", installed);
      }
    } catch (error) {
      console.error("Failed to initialize wallet service:", error);
    }
  }

  /**
   * Check if Crossmark wallet is installed and available
   */
  public isCrossmarkInstalled(): boolean {
    return !!this.sdk?.sync?.isInstalled();
  }

  /**
   * Check if wallet is connected
   */
  public async isWalletConnected(): Promise<boolean> {
    if (!this.sdk) {
      await this.initialize();
    }

    try {
      // Use Crossmark's method to check if a wallet is already connected
      const signInData = this.sdk?.sync?.getSignInData();
      return !!signInData?.data?.address;
    } catch (error) {
      console.error("Failed to check wallet connection status:", error);
      return false;
    }
  }

  /**
   * Get the current wallet address if connected
   */
  public getWalletAddress(): string | null {
    if (!this.sdk) return null;

    try {
      const signInData = this.sdk.sync.getSignInData();
      return signInData?.data?.address || null;
    } catch (error) {
      console.error("Failed to get wallet address:", error);
      return null;
    }
  }

  /**
   * Connect to wallet and return the address
   */
  public async connectWallet(): Promise<string | null> {
    if (!this.sdk) {
      await this.initialize();
    }

    if (!this.isCrossmarkInstalled()) {
      throw new Error("Wallet extension is not installed");
    }

    try {
      // Use Crossmark's signIn method
      const response = await this.sdk.async.signInAndWait();
      if (response.response?.data?.address) {
        return response.response.data.address;
      }
      return null;
    } catch (error) {
      console.error("Failed to connect to wallet:", error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  public async disconnectWallet(): Promise<void> {
    if (!this.sdk) return;

    try {
      await this.sdk.async.signOut();
    } catch (error) {
      console.error("Failed to disconnect from wallet:", error);
      throw error;
    }
  }

  /**
   * Get wallet balance (using mock for now as Crossmark SDK doesn't have a direct balance method)
   */
  public async getWalletBalance(): Promise<{
    xrp: number;
    [key: string]: number;
  }> {
    // In a real implementation, you would fetch this from XRPL
    // For now, we'll return a mock balance
    return { xrp: 100 + Math.random() * 900 };
  }

  /**
   * Send transaction from user wallet to main agent
   */
  public async sendTransaction(
    amount: number,
    memo?: string
  ): Promise<TransactionResponse> {
    if (!this.sdk) {
      await this.initialize();
    }

    if (!this.isCrossmarkInstalled()) {
      throw new Error("Wallet extension is not installed");
    }

    try {
      const address = this.getWalletAddress();

      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Create payment transaction
      const payment = {
        TransactionType: "Payment",
        Account: address,
        Destination: this.mainWalletAddress,
        Amount: String(Math.floor(amount * 1000000)), // Convert to drops (XRP's smallest unit)
        Fee: "12", // Standard fee in drops
      };

      // Sign and submit transaction using Crossmark
      const response = await this.sdk.async.signAndWait(payment);

      // Check if successful
      const isSuccess = response.response?.data?.success !== false;
      const txHash = response.response?.data?.hash || `tx-${Date.now()}`;

      // Create transaction record
      const transaction: Transaction = {
        id: `user-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: address,
        to: "main-agent",
        amount,
        currency: "XRP",
        timestamp: new Date().toISOString(),
        status: isSuccess ? "confirmed" : "failed",
        type: "payment",
        xrpTxHash: txHash,
        fee: 0.000012, // Standard XRP fee
        memo: memo || "User wallet transfer",
      };

      return {
        transaction,
        success: isSuccess,
        ledgerResponse: response,
      };
    } catch (error) {
      console.error("Transaction failed:", error);

      // Create a failed transaction record
      const transaction: Transaction = {
        id: `failed-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: this.getWalletAddress() || "unknown",
        to: "main-agent",
        amount,
        currency: "XRP",
        timestamp: new Date().toISOString(),
        status: "failed",
        type: "payment",
        memo: memo || "Failed user wallet transfer",
      };

      return {
        transaction,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the main wallet address
   */
  public getMainWalletAddress(): string {
    return this.mainWalletAddress;
  }
}

// Export singleton instance
const walletService = WalletService.getInstance();
export default walletService;
