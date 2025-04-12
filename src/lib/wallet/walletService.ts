/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/wallet/walletService.ts
import XrpClient from "@/lib/xrp/client";
import crossmarkClient from "@/lib/crossmark/client";

const MAIN_AGENT_ADDRESS = process.env.NEXT_PUBLIC_MAIN_AGENT_ADDRESS || "rpQQydq6iB5zexDkEHFUxNBVheiwRXhyDh"; // set correctly

class WalletService {
  private xrplClient = XrpClient.getInstance();
  private crossmark = crossmarkClient;

  public async initialize(): Promise<void> {
    await this.xrplClient.initialize();
    // Optionally perform any Crossmark initialization here.
  }

  public isCrossmarkInstalled(): boolean {
    try {
      return this.crossmark.isInstalled();
    } catch (error) {
      console.log("Error checking Crossmark installation:", error);
      return false;
    }
  }

  public async isWalletConnected(): Promise<boolean> {
    if (this.isCrossmarkInstalled()) {
      return await this.crossmark.isConnected();
    }
    // Fallback: Check if XRPL wallet for "user-wallet" exists
    return !!(await this.xrplClient.getWallet("user-wallet")); // adjust according to your implementation
  }

  public async connectWallet(): Promise<string | null> {
    if (this.isCrossmarkInstalled()) {
      const address = await this.crossmark.connect();
      return address;
    } else {
      const wallet = await this.xrplClient.createWallet("user-wallet");
      return wallet.address;
    }
  }

  public async getWalletAddress(): Promise<string | null> {
    if (this.isCrossmarkInstalled() && (await this.crossmark.isConnected())) {
      const address = this.crossmark.getAddress();
      if (!address) {
        throw new Error("Crossmark wallet not connected");
      }
      return address;
    }
    // Fallback: Get the cached wallet address for "user-wallet"
    const wallet = await this.xrplClient.getWallet("user-wallet");
    if (!wallet) {
      throw new Error("No wallet found");
    }
    return wallet.address;
  }

  /**
   * Retrieve the wallet balance. For Crossmark, we query the XRP ledger
   * using the wallet address returned by Crossmark. For the XRPL fallback,
   * we use the cached wallet keyed as "user-wallet".
   */
  public async getWalletBalance(): Promise<{ xrp: number }> {
    if (this.isCrossmarkInstalled() && (await this.crossmark.isConnected())) {
      const address = this.crossmark.getAddress();
      if (!address) {
        throw new Error("Crossmark wallet not connected");
      }
      const balance = await this.xrplClient.getBalanceByAddress(address);
      return { xrp: balance };
    } else {
      const balance = await this.xrplClient.getBalance("user-wallet");
      return { xrp: balance };
    }
  }

  public async disconnectWallet(): Promise<void> {
    if (this.isCrossmarkInstalled() && (await this.crossmark.isConnected())) {
      await this.crossmark.disconnect();
    } else {
      this.xrplClient.clearWalletFromCache("user-wallet");
    }
  }


  public async sendTransaction(amount: number, memo?: string): Promise<any> {
    if (this.isCrossmarkInstalled() && (await this.crossmark.isConnected())) {
      return await this.crossmark.topUpBalance(MAIN_AGENT_ADDRESS, amount);
    } else {
      return await this.xrplClient.sendPayment({
        fromAgentId: "user-wallet",
        toAgentId: "main-agent",
        amount,
        memo,
        currency: "XRP",
      });
    }
  }
}

const walletService = new WalletService();
export default walletService;
