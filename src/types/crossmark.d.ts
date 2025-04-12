/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/crossmark.d.ts

/**
 * Type definitions for the Crossmark browser extension
 */

interface CrossmarkWallet {
  isConnected: () => Promise<boolean>;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  getAddress: () => Promise<string | null>;
  getBalance: () => Promise<{ xrp: number;[key: string]: number }>;
  signAndSubmitTransaction: (tx: any) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

// Extend the Window interface to include crossmark
declare global {
  interface Window {
    crossmark?: CrossmarkWallet;
  }
}

export { };
