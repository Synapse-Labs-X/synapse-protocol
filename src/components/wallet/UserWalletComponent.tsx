// src/components/wallet/UserWalletComponent.tsx

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowRight,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import walletService from "@/lib/wallet/walletService";

interface UserWalletComponentProps {
  onBalanceUpdate: (amount: number) => void;
  currentBalance: number;
}

const UserWalletComponent: React.FC<UserWalletComponentProps> = ({
  onBalanceUpdate,
  currentBalance,
}) => {
  // State management
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isCrossmarkInstalled, setIsCrossmarkInstalled] = useState<
    boolean | null
  >(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get the main wallet address from the service
  const mainWalletAddress = walletService.getMainWalletAddress();

  // Initialize service and check if wallet is installed/connected
  useEffect(() => {
    const initWallet = async () => {
      await walletService.initialize();

      const installed = walletService.isCrossmarkInstalled();
      setIsCrossmarkInstalled(installed);

      if (installed) {
        const connected = await walletService.isWalletConnected();
        setIsWalletConnected(connected);

        if (connected) {
          const address = walletService.getWalletAddress();
          setWalletAddress(address);

          // Get balance
          try {
            const balances = await walletService.getWalletBalance();
            setWalletBalance(balances.xrp || 0);
          } catch (err) {
            console.error("Failed to get balance:", err);
          }
        }
      }
    };

    initWallet();
  }, []);

  // Connect to wallet
  const connectWallet = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const address = await walletService.connectWallet();
      if (address) {
        setWalletAddress(address);
        setIsWalletConnected(true);

        // Get balance
        const balances = await walletService.getWalletBalance();
        setWalletBalance(balances.xrp || 0);

        // Open modal
        setShowModal(true);
      } else {
        throw new Error("Failed to connect to wallet - no address returned");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError(
        error instanceof Error ? error.message : "Failed to connect to wallet"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      await walletService.disconnectWallet();
      setIsWalletConnected(false);
      setWalletAddress(null);
      setWalletBalance(0);
      setShowModal(false);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  // Transfer funds from user wallet to Synapse
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Convert amount to number
      const transferAmount = parseFloat(amount);

      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      if (transferAmount > walletBalance) {
        throw new Error(
          `Insufficient balance. Available: ${walletBalance.toFixed(2)} XRP`
        );
      }

      // Execute transaction
      const result = await walletService.sendTransaction(
        transferAmount,
        "Transfer to Synapse"
      );

      if (result.success) {
        // Set transaction hash
        setTxHash(result.transaction.xrpTxHash || "tx-" + Date.now());

        // Update balance after successful transaction
        try {
          const newBalances = await walletService.getWalletBalance();
          setWalletBalance(newBalances.xrp || 0);
        } catch (err) {
          console.error("Failed to update balance:", err);
        }

        // Update the Synapse balance
        onBalanceUpdate(transferAmount);

        // Show success state
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

  // Refresh wallet balance
  const refreshBalance = async () => {
    if (!isWalletConnected) return;

    try {
      const balances = await walletService.getWalletBalance();
      setWalletBalance(balances.xrp || 0);
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  };

  // Install Crossmark wallet
  const handleInstallCrossmark = () => {
    window.open("https://crossmark.io", "_blank");
  };

  // Format wallet address for display
  const formatAddress = (address: string | null): string => {
    if (!address) return "";
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <>
      {/* Main wallet button */}
      <div className="relative">
        <button
          onClick={
            isCrossmarkInstalled
              ? isWalletConnected
                ? () => setShowModal(true)
                : connectWallet
              : handleInstallCrossmark
          }
          className="group relative px-3 py-2 rounded-lg bg-blue-800/50 border border-blue-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-blue-800 hover:border-blue-600/50 flex items-center gap-2"
          disabled={isProcessing}
        >
          <Wallet size={16} className="text-blue-400" />
          <div>
            <span className="text-gray-400 text-xs">XRP</span>
            <div className="text-sm">
              {isCrossmarkInstalled === false ? (
                <span className="text-blue-400">Install Wallet</span>
              ) : isWalletConnected ? (
                <span className="text-green-400 flex items-center gap-1">
                  Connected
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                </span>
              ) : (
                <span>Connect Wallet</span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Wallet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"></div>

          {/* Modal Content - positioned in center of screen */}
          <div className="relative z-10 bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
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
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    setSuccess(false);
                    setTxHash(null);
                  }}
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
                  /* Success View */
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      Transfer Complete!
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Successfully transferred {amount} XRP to your Synapse
                      wallet.
                    </p>

                    {/* Transaction Details */}
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
                      {/* View on Explorer Button */}
                      {txHash && txHash.startsWith("tx-") === false && (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 transition-colors p-3 rounded-lg flex items-center justify-center gap-2"
                        >
                          View on XRPL Explorer
                          <ExternalLink size={14} />
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSuccess(false);
                          setTxHash(null);
                        }}
                        className="block w-full text-center bg-gray-700 hover:bg-gray-600 transition-colors p-3 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Transaction Form */
                  <>
                    {/* Wallet Info */}
                    <div className="mb-4 bg-gray-900/60 p-4 rounded-lg border border-gray-700/50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">
                          Wallet Address
                        </div>
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
                      {/* Amount Input */}
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
                          Min: 0.01 XRP | Available: {walletBalance.toFixed(2)}{" "}
                          XRP
                        </div>
                      </div>

                      {/* Destination Info */}
                      <div className="mb-4 flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                        <div className="text-sm">
                          <div className="text-gray-400">Destination:</div>
                          <div className="font-medium">Synapse Main Agent</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-400">Current Balance:</div>
                          <div className="font-medium">
                            {currentBalance.toFixed(2)} RLUSD
                          </div>
                        </div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 flex items-start">
                          <AlertCircle
                            size={18}
                            className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-red-400 text-sm">{error}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            setError(null);
                          }}
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
        </div>
      )}
    </>
  );
};

export default UserWalletComponent;
