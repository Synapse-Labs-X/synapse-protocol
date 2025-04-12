"use client";

import React, { useState, useEffect } from "react";
import { Wallet, X, Check, AlertCircle } from "lucide-react";
import crossmarkClient from "@/lib/crossmark/client";

interface CrossmarkWalletProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUpComplete: (amount: number) => void;
  currentBalance: number;
}

const CrossmarkWallet: React.FC<CrossmarkWalletProps> = ({
  isOpen,
  onClose,
  onTopUpComplete,
  currentBalance,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<{
    xrp: number;
    [key: string]: number;
  }>({ xrp: 0 });
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Check if Crossmark extension is installed and connected
  useEffect(() => {
    const checkConnection = async () => {
      if (isOpen) {
        // Reset state when modal opens
        setError(null);
        setSuccess(false);

        try {
          // Check if Crossmark is installed
          if (!crossmarkClient.isInstalled()) {
            setError(
              "Crossmark extension is not installed. Please install it to continue."
            );
            return;
          }

          // Check if already connected
          const connected = await crossmarkClient.isConnected();
          setIsConnected(connected);

          if (connected) {
            // Get wallet address and balance
            const addr = crossmarkClient.getAddress();
            setAddress(addr);

            try {
              const balances = await crossmarkClient.getBalance();
              setBalance(balances);
            } catch (err) {
              console.error("Failed to get balance:", err);
            }
          }
        } catch (err) {
          console.error("Failed to check Crossmark connection:", err);
          setError("Failed to connect to Crossmark wallet. Please try again.");
        }
      }
    };

    checkConnection();
  }, [isOpen]);

  if (!isOpen) return null;

  const connectWallet = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      if (!crossmarkClient.isInstalled()) {
        throw new Error("Crossmark extension is not installed");
      }

      const walletAddress = await crossmarkClient.connect();
      setIsConnected(!!walletAddress);
      setAddress(walletAddress);

      if (walletAddress) {
        const balances = await crossmarkClient.getBalance();
        setBalance(balances);
      }
    } catch (err) {
      console.error("Failed to connect to Crossmark:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to Crossmark wallet"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await crossmarkClient.disconnect();
      setIsConnected(false);
      setAddress(null);
      setBalance({ xrp: 0 });
    } catch (err) {
      console.error("Failed to disconnect from Crossmark:", err);
    }
  };

  const handleTopUp = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      if (numAmount > balance.xrp) {
        throw new Error(
          `Insufficient balance. Available: ${balance.xrp.toFixed(2)} XRP`
        );
      }

      // Use mainAgentAddress - in a real implementation, you would get this from your configuration
      const mainAgentAddress = "rMainAgentAddressHere"; // Replace with actual address

      // Execute the transaction
      const result = await crossmarkClient.topUpBalance(
        mainAgentAddress,
        numAmount
      );

      if (result.success) {
        setSuccess(true);
        onTopUpComplete(numAmount);

        // Update balance after successful transaction
        const newBalances = await crossmarkClient.getBalance();
        setBalance(newBalances);

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing the top-up"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatWalletAddress = (addr: string | null): string => {
    if (!addr || addr.length < 10) return addr || "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center">
            <Wallet size={20} className="mr-2 text-blue-400" />
            Crossmark Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="bg-green-500 rounded-full p-2">
                    <Check size={24} className="text-white" />
                  </div>
                </div>
                <h3 className="text-green-400 font-bold">Top-Up Successful</h3>
                <p className="text-sm mt-2 text-gray-300">
                  Your wallet has been successfully funded with{" "}
                  {parseFloat(amount).toFixed(2)} XRP.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors text-center mt-2"
              >
                Close
              </button>
            </div>
          ) : isConnected && address ? (
            <>
              <div className="mb-4 bg-gray-900/60 p-4 rounded-lg border border-gray-700/50">
                <div className="text-sm text-gray-400 mb-1">
                  Connected Wallet
                </div>
                <div className="font-medium text-green-400 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  {formatWalletAddress(address)}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  Balance:{" "}
                  <span className="font-mono">
                    {balance.xrp.toFixed(2)} XRP
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Amount to Top Up
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
                    max={balance.xrp.toString()}
                    required
                    disabled={isProcessing}
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    XRP
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Min: 0.01 XRP | Available: {balance.xrp.toFixed(2)} XRP
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="text-sm">
                  <div className="text-gray-400">Transfer to:</div>
                  <div className="font-medium">Synapse Main Agent</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-400">Current Balance:</div>
                  <div className="font-medium">
                    {currentBalance.toFixed(2)} RLUSD
                  </div>
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
                  onClick={disconnectWallet}
                  className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
                  disabled={isProcessing}
                >
                  Disconnect
                </button>
                <button
                  onClick={handleTopUp}
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
                      Processing Top-Up...
                    </span>
                  ) : (
                    "Top Up Wallet"
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-6 mb-6">
                  <Wallet size={40} className="mx-auto mb-4 text-blue-400" />
                  <h3 className="text-lg font-bold mb-2">
                    Connect to Crossmark
                  </h3>
                  <p className="text-sm text-gray-400">
                    Connect your Crossmark wallet to top up your RLUSD balance.
                    Crossmark is a secure XRP wallet for seamless transactions.
                  </p>
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

                <button
                  onClick={connectWallet}
                  className={`w-full py-3 px-4 rounded-lg font-medium ${
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
                      Connecting...
                    </span>
                  ) : (
                    "Connect Wallet"
                  )}
                </button>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <p className="text-xs text-gray-500 text-center">
                  Don&apos;t have Crossmark wallet?{" "}
                  <a
                    href="https://crossmark.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Install the extension
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrossmarkWallet;
