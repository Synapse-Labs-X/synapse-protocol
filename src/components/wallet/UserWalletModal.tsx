"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  X,
  Copy,
  Loader,
} from "lucide-react";
import walletService from "@/lib/wallet/walletService";

interface UserWalletModalProps {
  isOpen: boolean;
  onModalClose: () => void;
  onBalanceUpdate: (amount: number) => void;
  currentBalance: number;
  onConnectionChange: (connected: boolean) => void;
}

const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onModalClose,
  onBalanceUpdate,
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
  const [copied, setCopied] = useState(false);

  // Local function to close modal and reset states
  const handleClose = () => {
    setShowModal(false);
    setError(null);
    setSuccess(false);
    setTxHash(null);
    onModalClose();
  };

  // Manage the local "show modal" state
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
    return `${address.substring(0, 8)}...${address.substring(
      address.length - 6
    )}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!showModal || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="relative bg-gray-800 rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-700/70 overflow-hidden transition-all transform scale-100 opacity-100">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                {success ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Wallet size={20} className="text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {success ? "Transaction Complete" : "XRP Wallet"}
                </h3>
                <p className="text-sm text-gray-400">
                  {success
                    ? "Successfully transferred funds"
                    : walletAddress
                    ? "Manage your funds"
                    : "Connect your wallet"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {success ? (
            <div className="space-y-6">
              {/* Success animation */}
              <div className="relative flex justify-center py-5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 animate-pulse"></div>
                </div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-green-800/40 border-4 border-green-500/30 flex items-center justify-center">
                  <Check size={30} className="text-green-400" />
                </div>
              </div>

              {/* Transaction details */}
              <div>
                <h3 className="text-center text-xl font-medium mb-2">
                  Transfer Complete!
                </h3>
                <p className="text-center text-gray-300 mb-6">
                  Successfully transferred {amount} XRP to your Synapse wallet
                </p>

                <div className="space-y-4">
                  {/* Amount card */}
                  <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center">
                          <ArrowRight size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">
                            Amount Sent
                          </div>
                          <div className="text-lg font-medium">
                            {amount} XRP
                          </div>
                        </div>
                      </div>
                      <div className="text-green-400 text-sm flex items-center gap-1.5">
                        <Check size={14} />
                        Confirmed
                      </div>
                    </div>
                  </div>

                  {/* Transaction hash */}
                  {txHash && (
                    <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
                      <div className="text-sm text-gray-400 mb-2">
                        Transaction Hash
                      </div>
                      <div className="font-mono text-xs text-blue-300 bg-gray-800/80 p-2 rounded flex items-center justify-between">
                        <span className="truncate">
                          {txHash.length > 20
                            ? `${txHash.substring(0, 10)}...${txHash.substring(
                                txHash.length - 10
                              )}`
                            : txHash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(txHash)}
                          className="ml-2 p-1 rounded hover:bg-gray-700/70 text-gray-400 hover:text-white transition-colors"
                          title="Copy hash"
                        >
                          {copied ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {txHash && !txHash.startsWith("tx-") && (
                  <a
                    href={`https://testnet.xrpl.org/transactions/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    View on XRPL Explorer
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : !walletAddress ? (
            <div className="space-y-6 py-6">
              {/* Wallet connection animation */}
              <div className="relative flex justify-center py-5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-blue-500/10 animate-pulse"></div>
                </div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-blue-800/40 border-4 border-blue-500/30 flex items-center justify-center">
                  <Wallet size={24} className="text-blue-400" />
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-xl font-medium">Wallet Not Connected</h3>
                <p className="text-gray-300">
                  Connect your XRP wallet to send funds to Synapse
                </p>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected wallet information */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-300">Wallet Address</div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-green-300">
                      Connected
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm bg-gray-800/80 py-1 px-2 rounded flex items-center">
                    {formatAddress(walletAddress)}
                    <button
                      onClick={() =>
                        walletAddress && copyToClipboard(walletAddress)
                      }
                      className="ml-2 p-1 rounded hover:bg-gray-700/70 text-gray-400 hover:text-white transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check size={12} className="text-green-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-medium text-lg">
                      {walletBalance.toFixed(2)} XRP
                    </span>
                    <button
                      onClick={refreshBalance}
                      className="p-1.5 rounded hover:bg-gray-700/70 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Refresh balance"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Transfer form */}
              <form onSubmit={handleTransfer} className="space-y-5">
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Amount to Send
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-700/70 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      max={walletBalance.toString()}
                      required
                      disabled={isProcessing}
                    />
                    <div className="absolute right-3 top-3 text-gray-400 font-medium">
                      XRP
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500 flex justify-between">
                    <span>Min: 0.01 XRP</span>
                    <span>Available: {walletBalance.toFixed(2)} XRP</span>
                  </div>
                </div>

                {/* Destination info */}
                <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-2">Destination</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 2L20 7L12 12L4 7L12 2Z"
                            stroke="#3B82F6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20 12L12 17L4 12"
                            stroke="#3B82F6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20 17L12 22L4 17"
                            stroke="#3B82F6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Synapse Protocol</div>
                        <div className="text-xs text-gray-500">
                          Agent Payment Network
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Current: {currentBalance.toFixed(2)} RLUSD
                    </div>
                  </div>
                </div>

                {/* Error display */}
                {error && (
                  <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 flex items-start">
                    <AlertCircle
                      size={18}
                      className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
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
                        ? "bg-blue-800/70 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } transition-colors flex items-center justify-center gap-2`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={16} />
                        <span>Send Transaction</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Disconnect option */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className="text-sm text-gray-400 hover:text-gray-300 py-2 px-3 rounded-md hover:bg-gray-700/50 transition-colors"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserWalletModal;
