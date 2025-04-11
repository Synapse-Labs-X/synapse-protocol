// Transaction type definitions for Synapse

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionType = 'payment' | 'subscription' | 'refund' | 'setup';

export interface Transaction {
  id: string;
  from: string;  // Agent ID of sender
  to: string;    // Agent ID of receiver
  amount: number;
  currency: string; // Default is 'RLUSD'
  timestamp: string;
  status: TransactionStatus;
  type: TransactionType;
  xrpTxHash?: string; // XRP ledger transaction hash
  ledgerIndex?: number;
  fee?: number;
  memo?: string;
}

export interface TransactionRequest {
  fromAgentId: string;
  toAgentId: string;
  amount: number;
  currency?: string;
  type?: TransactionType;
  memo?: string;
}

export interface TransactionResponse {
  transaction: Transaction;
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ledgerResponse?: any; // XRP ledger response
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  maxExecutions?: number; // null means unlimited
}

export interface Subscription {
  id: string;
  planId: string;
  fromAgentId: string;
  toAgentId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'paused' | 'cancelled';
  nextBillingDate: string;
  transactions: string[]; // Array of transaction IDs
}