/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { Transaction, TransactionRequest, TransactionResponse } from '@/types/transaction';

// Type definitions to handle XRPL response structures
interface XrplTransactionResult {
  result: {
    hash?: string;
    ledger_index?: number;
    meta?: {
      TransactionResult?: string;
    } | string;
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
  private client: Client;
  private wallets: Map<string, Wallet> = new Map();
  private initialized: boolean = false;
  private networkUrl: string;

  private constructor() {
    // XRP Testnet URL
    this.networkUrl = process.env.NEXT_PUBLIC_XRP_TESTNET_URL || 'wss://s.altnet.rippletest.net:51233';
    this.client = new Client(this.networkUrl);
  }

  public static getInstance(): XrpClient {
    if (!XrpClient.instance) {
      XrpClient.instance = new XrpClient();
    }
    return XrpClient.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        console.log('Connecting to XRP Testnet...');
        await this.client.connect();
        this.initialized = true;
        console.log('Connected to XRP Testnet');
      } catch (error) {
        console.error('Failed to connect to XRP Testnet:', error);
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.initialized) {
      await this.client.disconnect();
      this.initialized = false;
    }
  }

  public async getWallet(agentId: string): Promise<Wallet> {
    if (!this.initialized) {
      await this.initialize();
    }

    let wallet = this.wallets.get(agentId);
    if (!wallet) {
      // Check if we have a stored wallet for this agent
      // For demo, we'll create a new one each time
      wallet = await this.createWallet(agentId);
    }
    return wallet;
  }

  public async createWallet(agentId: string): Promise<Wallet> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create a new wallet
      const wallet = Wallet.generate();

      // Fund the wallet from testnet faucet
      const fundResult = await this.client.fundWallet(wallet);
      const fundedWallet = fundResult.wallet;

      // Store the wallet
      this.wallets.set(agentId, fundedWallet);

      return fundedWallet;
    } catch (error) {
      console.error(`Failed to create wallet for agent ${agentId}:`, error);
      throw error;
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
      // Get wallets
      const fromWallet = await this.getWallet(fromAgentId);
      const toWallet = await this.getWallet(toAgentId);

      // Prepare transaction
      const prepared = await this.client.autofill({
        TransactionType: 'Payment',
        Account: fromWallet.address,
        Amount: xrpToDrops(amount), // Convert to drops (XRP's smallest unit)
        Destination: toWallet.address,
        Memos: memo ? [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex')
          }
        }] : undefined
      });

      // Sign and submit transaction
      const signed = fromWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob) as unknown as XrplTransactionResult;

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
        currency: 'RLUSD',
        timestamp: new Date().toISOString(),
        status: isSuccess ? 'confirmed' : 'failed',
        type: 'payment',
        xrpTxHash: result.result.hash,
        ledgerIndex: result.result.ledger_index,
        fee: fee,
        memo: memo
      };

      return {
        transaction,
        success: isSuccess,
        ledgerResponse: result
      };
    } catch (error) {
      console.error('Payment failed:', error);

      // Create failed transaction record
      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: 'RLUSD',
        timestamp: new Date().toISOString(),
        status: 'failed',
        type: 'payment',
        memo: memo
      };

      return {
        transaction,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to safely extract transaction result
  private isTransactionSuccessful(result: XrplTransactionResult): boolean {
    if (!result || !result.result) return false;

    const { meta } = result.result;

    // Check if meta is an object with TransactionResult property
    if (meta && typeof meta === 'object' && 'TransactionResult' in meta) {
      return meta.TransactionResult === 'tesSUCCESS';
    }

    return false;
  }

  // Helper method to safely extract transaction fee
  private extractTransactionFee(result: XrplTransactionResult): number {
    if (!result || !result.result || !result.result.Fee) return 0;

    try {
      return dropsToXrp(result.result.Fee);
    } catch (error) {
      console.error('Error parsing transaction fee:', error);
      return 0;
    }
  }

  public async getBalance(agentId: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const wallet = await this.getWallet(agentId);
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated'
      }) as unknown as XrplAccountInfoResult;

      if (accountInfo?.result?.account_data?.Balance) {
        try {
          // Convert from drops to XRP
          return dropsToXrp(accountInfo.result.account_data.Balance);
        } catch (error) {
          console.error('Error parsing balance:', error);
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
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create simulated transaction
    const transaction: Transaction = {
      id: `sim-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      from: fromAgentId,
      to: toAgentId,
      amount,
      currency: 'RLUSD',
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      type: 'payment',
      xrpTxHash: `simulated-hash-${Math.random().toString(36).substring(2, 15)}`,
      ledgerIndex: Math.floor(Math.random() * 1000000),
      memo: memo,
      fee: 0.000012 // Standard XRP transaction fee
    };

    return {
      transaction,
      success: true
    };
  }
}

export default XrpClient;