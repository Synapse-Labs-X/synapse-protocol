// src/components/wallet/UserWalletModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import walletService from "@/lib/wallet/walletService";

interface UserWalletModalProps {
  isOpen: boolean;
  onModalClose: () => void; // renamed prop to onModalClose for clarity
  onBalanceUpdate: (amount: number) => void;
  currentBalance: number;
  onConnectionChange: (connected: boolean) => void;
}

const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onModalClose,
  onBalanceUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentBalance,
  onConnectionChange,
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Local function to close modal and reset states.
  const handleClose = () => {
    setShowModal(false);
    setError(null);
    setSuccess(false);
    setTxHash(null);
    onModalClose();
  };

  // Since we're using a modal component that is rendered only when open,
  // we need to manage the local "show modal" state.
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
    if (isOpen) {
      loadWalletData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadWalletData = async () => {
    try {
      const address = await walletService.getWalletAddress();
      setWalletAddress(address);
      if (address) {
        const balances = await walletService.getWalletBalance();
        setWalletBalance(balances.xrp || 0);
        onConnectionChange(true);
      } else {
        onConnectionChange(false);
      }
    } catch (err) {
      console.error("Failed to load wallet data:", err);
    }
  };

  const disconnectWallet = async () => {
    try {
      await walletService.disconnectWallet();
      setWalletAddress(null);
      setWalletBalance(0);
      onConnectionChange(false);
      handleClose();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);
    try {
      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      if (transferAmount > walletBalance) {
        throw new Error(
          `Insufficient balance. Available: ${walletBalance.toFixed(2)} XRP`
        );
      }
      const result = await walletService.sendTransaction(
        transferAmount,
        "Transfer to Synapse"
      );
      if (result.success) {
        setTxHash(result.transaction.xrpTxHash || "tx-" + Date.now());
        try {
          const newBalances = await walletService.getWalletBalance();
          setWalletBalance(newBalances.xrp || 0);
        } catch (err) {
          console.error("Failed to update balance:", err);
        }
        onBalanceUpdate(transferAmount);
        setSuccess(true);
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (err) {
      console.error("Transaction failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing the transaction"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const balances = await walletService.getWalletBalance();
      setWalletBalance(balances.xrp || 0);
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  };

  const formatAddress = (address: string | null): string => {
    if (!address) return "";
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  if (!showModal || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={handleClose}
      ></div>
      <div className="relative z-10 bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-xl overflow-hidden">
        <div className="flex flex-col justify-between items-center p-4 border-b border-gray-700">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {success ? (
                <>
                  <Check size={18} className="text-green-400" />
                  Transaction Complete
                </>
              ) : (
                <>
                  <Wallet size={18} className="text-blue-400" />
                  XRP Wallet
                </>
              )}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">Transfer Complete!</h3>
                <p className="text-gray-300 mb-4">
                  Successfully transferred {amount} XRP to your Synapse wallet.
                </p>
                <div className="bg-gray-900/60 rounded-lg p-4 mb-4 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Amount</span>
                    <span className="font-medium">{amount} XRP</span>
                  </div>
                  {txHash && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">
                        Transaction Hash
                      </span>
                      <span className="font-mono text-xs text-blue-400 truncate max-w-32">
                        {txHash.substring(0, 8)}...
                        {txHash.substring(txHash.length - 8)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <Check size={12} /> Confirmed
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {txHash && !txHash.startsWith("tx-") && (
                    <a
                      href={`https://testnet.xrpl.org/transactions/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 transition-colors p-3 rounded-lg flex items-center justify-center gap-2"
                    >
                      View on XRPL Explorer <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={handleClose}
                    className="block w-full text-center bg-gray-700 hover:bg-gray-600 transition-colors p-3 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : !walletAddress ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={28} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Wallet Not Connected
                </h3>
                <p className="text-gray-300 mb-6">
                  Please connect your wallet to send XRP to Synapse.
                </p>
                <button
                  onClick={handleClose}
                  className="block w-full text-center bg-gray-700 hover:bg-gray-600 transition-colors p-3 rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 bg-gray-900/60 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-400">Wallet Address</div>
                    <div className="font-mono text-sm flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      {formatAddress(walletAddress)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      Available Balance
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-lg">
                        {walletBalance.toFixed(2)} XRP
                      </span>
                      <button
                        onClick={refreshBalance}
                        className="ml-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Refresh balance"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleTransfer}>
                  <div className="mb-4">
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-400 mb-1"
                    >
                      Amount to Send
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        max={walletBalance.toString()}
                        required
                        disabled={isProcessing}
                      />
                      <div className="absolute right-3 top-3 text-gray-400">
                        XRP
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Min: 0.01 XRP | Available: {walletBalance.toFixed(2)} XRP
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 flex items-start">
                      <AlertCircle
                        size={18}
                        className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-red-400 text-sm">{error}</span>
                    </div>
                  )}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                        isProcessing
                          ? "bg-blue-800 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      } transition-colors`}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        "Send Transaction"
                      )}
                    </button>
                  </div>
                </form>
                <button
                  onClick={disconnectWallet}
                  className="w-full text-center mt-4 text-sm text-gray-400 hover:text-gray-300"
                >
                  Disconnect Wallet
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserWalletModal;
