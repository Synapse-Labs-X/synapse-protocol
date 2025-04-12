"use client";

import React, { useState, useEffect } from "react";
import { Wallet, ArrowRight, Check, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";

interface CrossmarkWalletSDKProps {
  onBalanceUpdate: (newBalance: number) => void;
  currentBalance: number;
}

const CrossmarkWalletSDK: React.FC<CrossmarkWalletSDKProps> = ({
  onBalanceUpdate,
  currentBalance,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [crossmarkAddress, setCrossmarkAddress] = useState<string | null>(null);
  const [crossmarkBalance, setCrossmarkBalance] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Check if Crossmark is installed
  useEffect(() => {
    const checkCrossmarkInstallation = async () => {
      try {
        // Using dynamic import to avoid SSR issues
        const sdk = (await import("@crossmarkio/sdk")).default;
        const installed = sdk.sync.isInstalled();
        setIsInstalled(installed ?? false);
      } catch (error) {
        console.error("Error checking Crossmark installation:", error);
        setIsInstalled(false);
      }
    };

    checkCrossmarkInstallation();
  }, []);

  // Connect to Crossmark wallet
  const connectWallet = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const sdk = (await import("@crossmarkio/sdk")).default;
      const installed = sdk.sync.isInstalled();

      if (!installed) {
        throw new Error(
          "Crossmark wallet is not installed. Please install it first."
        );
      }

      // Sign in to get the address
      const response = await sdk.async.signInAndWait();
      if (response.response.data.address) {
        setCrossmarkAddress(response.response.data.address);
        setIsConnected(true);

        // Get balance - In a real implementation, you would call the XRP Ledger
        // Here we're setting a mock balance
        setCrossmarkBalance(Math.random() * 1000 + 100);

        // Open modal
        setIsModalOpen(true);
      } else {
        throw new Error("Failed to connect to wallet - no address returned");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to Crossmark wallet"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setIsConnected(false);
    setCrossmarkAddress(null);
    setCrossmarkBalance(0);
    setIsModalOpen(false);
  };

  // Transfer funds
  const transferFunds = async (transferAmount: number) => {
    setError(null);
    setSuccess(false);
    try {
      if (!isConnected || !crossmarkAddress) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      if (transferAmount > crossmarkBalance) {
        throw new Error(
          `Insufficient balance in Crossmark wallet. Available: ${crossmarkBalance.toFixed(
            2
          )} RLUSD`
        );
      }

      setIsProcessing(true);

      // In a real implementation, you would use the Crossmark SDK to create and sign a transaction
      // For example:
      // const sdk = (await import("@crossmarkio/sdk")).default;
      // const response = await sdk.async.signAndWait({
      //   TransactionType: "Payment",
      //   Account: crossmarkAddress,
      //   Destination: "rMainAgentAddress", // Replace with your main agent address
      //   Amount: String(Math.floor(transferAmount * 1000000)), // Convert XRP to drops
      // });

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update balances
      setCrossmarkBalance((prev) => prev - transferAmount);

      // Call the parent function to update main wallet balance
      onBalanceUpdate(transferAmount);

      setIsProcessing(false);
      setSuccess(true);

      // Close modal after success (with delay for user to see success message)
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
      }, 2000);

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Transaction failed. Please try again."
      );
      setIsProcessing(false);
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await transferFunds(parseFloat(amount));
  };

  // Install Crossmark
  const handleInstallCrossmark = () => {
    window.open(
      "https://chromewebstore.google.com/detail/crossmark-wallet/canipghmckojpianfgiklhbgpfmhjkjg",
      "_blank"
    );
  };

  return (
    <>
      {/* Main wallet button */}
      <div className="group relative px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800 hover:border-gray-600/50">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <button
          onClick={isInstalled ? connectWallet : handleInstallCrossmark}
          className="flex items-center gap-2"
          disabled={isProcessing}
        >
          <Wallet size={16} className="text-yellow-400" />
          <div>
            <span className="text-gray-400 text-xs">Crossmark</span>
            <div className="text-sm flex items-center">
              {isInstalled === false ? (
                <span className="text-yellow-400">Install Wallet</span>
              ) : isConnected ? (
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

      {/* Modal */}
      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wallet size={18} className="text-yellow-400" />
                  {success ? "Transfer Successful" : "Crossmark Wallet"}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                    setSuccess(false);
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
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      Transfer Complete!
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Successfully transferred {amount} RLUSD to your Synapse
                      wallet.
                    </p>
                    <div className="flex items-center justify-between bg-gray-900 rounded p-3 mb-4">
                      <div className="text-sm">
                        <div className="text-gray-400">New Balance:</div>
                        <div className="font-medium">
                          {(currentBalance + parseFloat(amount)).toFixed(2)}{" "}
                          RLUSD
                        </div>
                      </div>
                      <ArrowRight className="text-green-400" size={20} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between bg-gray-900 rounded p-3">
                        <div>
                          <div className="text-sm text-gray-400">
                            Wallet Address:
                          </div>
                          <div className="font-mono text-sm">
                            {crossmarkAddress
                              ? `${crossmarkAddress.substring(
                                  0,
                                  6
                                )}...${crossmarkAddress.substring(
                                  crossmarkAddress.length - 4
                                )}`
                              : "Not connected"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Balance:</div>
                          <div className="font-medium">
                            {crossmarkBalance.toFixed(2)} RLUSD
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label
                          htmlFor="amount"
                          className="block text-sm font-medium text-gray-400 mb-1"
                        >
                          Amount to Transfer
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
                            max={crossmarkBalance.toString()}
                            required
                            disabled={isProcessing}
                          />
                          <div className="absolute right-3 top-3 text-gray-400">
                            RLUSD
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Available balance: {crossmarkBalance.toFixed(2)} RLUSD
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
                          onClick={() => {
                            setIsModalOpen(false);
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
                            "Transfer Funds"
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
          </div>,
          document.body
        )}
    </>
  );
};

export default CrossmarkWalletSDK;
