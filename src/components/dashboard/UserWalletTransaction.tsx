/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Check,
  AlertCircle,
  Lock,
  CircleDollarSign,
} from "lucide-react";
import { createPortal } from "react-dom";

interface UserWalletTransactionProps {
  onTransactionComplete: (txData: { amount: number; txHash: string }) => void;
  websiteWalletAddress: string;
  currentBalance?: number;
}

const UserWalletTransaction: React.FC<UserWalletTransactionProps> = ({
  onTransactionComplete,
  websiteWalletAddress,
  currentBalance = 0,
}) => {
  // State management
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isXrplLoaded, setIsXrplLoaded] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [xrplClient, setXrplClient] = useState<any>(null);
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  // Load the XRPL library
  useEffect(() => {
    const loadXrpl = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const xrpl = await import("xrpl");
        const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();

        setXrplClient(client);
        setIsXrplLoaded(true);
        console.log("Connected to XRP Testnet");
      } catch (err) {
        console.error("Failed to connect to XRP Testnet:", err);
        setError("Failed to connect to XRP Testnet. Please try again later.");
      }
    };

    if (showModal && !isXrplLoaded) {
      loadXrpl();
    }

    return () => {
      // Disconnect client when component unmounts
      if (xrplClient && xrplClient.isConnected()) {
        xrplClient.disconnect();
      }
    };
  }, [showModal, isXrplLoaded, xrplClient]);

  // Functions for wallet management
  const connectWallet = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      if (!isXrplLoaded || !xrplClient) {
        throw new Error("XRP Ledger client not ready");
      }

      // For testnet demonstration, we'll create a new wallet
      // In production, you would integrate with a real wallet like Crossmark
      const xrpl = await import("xrpl");
      const generatedWallet = xrpl.Wallet.generate();

      // Fund the wallet from testnet faucet
      const fundResult = await xrplClient.fundWallet(generatedWallet);
      const fundedWallet = fundResult.wallet;

      setWallet(fundedWallet);
      setWalletAddress(fundedWallet.address);

      // Get balance
      const balanceResponse = await xrplClient.request({
        command: "account_info",
        account: fundedWallet.address,
        ledger_index: "validated",
      });

      const xrpBalance = xrpl.dropsToXrp(
        balanceResponse.result.account_data.Balance
      );
      setWalletBalance(xrpBalance);

      setIsWalletConnected(true);
      setIsProcessing(false);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setIsProcessing(false);
    }
  };

  // Send transaction to website wallet
  const sendTransaction = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      if (!isXrplLoaded || !xrplClient || !wallet) {
        throw new Error("Wallet not connected or XRP client not ready");
      }

      const xrpl = await import("xrpl");
      const amountValue = parseFloat(amount);

      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      if (amountValue > walletBalance) {
        throw new Error(
          `Insufficient balance. You have ${walletBalance.toFixed(
            2
          )} XRP available.`
        );
      }

      // Create a payment transaction
      const payment = {
        TransactionType: "Payment",
        Account: wallet.address,
        Destination: websiteWalletAddress,
        Amount: xrpl.xrpToDrops(amountValue),
        Fee: "12", // Standard fee in drops (0.000012 XRP)
      };

      // Prepare transaction
      const prepared = await xrplClient.autofill(payment);

      // Sign the transaction with the wallet
      const signed = wallet.sign(prepared);

      // Submit transaction
      const tx = await xrplClient.submitAndWait(signed.tx_blob);

      // Check result
      const resultCode = tx.result.meta.TransactionResult;

      if (resultCode === "tesSUCCESS") {
        // Transaction successful
        setSuccess(true);
        setTxHash(tx.result.hash);

        // Update balance
        setWalletBalance((prevBalance) => prevBalance - amountValue);

        // Notify parent component
        onTransactionComplete({
          amount: amountValue,
          txHash: tx.result.hash,
        });

        // Auto-close after success (optional)
        setTimeout(() => {
          setShowModal(false);
          // Reset after closing
          setSuccess(false);
        }, 5000);
      } else {
        throw new Error(`Transaction failed with code: ${resultCode}`);
      }
    } catch (err) {
      console.error("Transaction failed:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Button to open transaction modal */}
      <button
        onClick={() => setShowModal(true)}
        className="group relative px-3 py-2 rounded-lg bg-blue-800/50 border border-blue-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-blue-800 hover:border-blue-600/50 flex items-center gap-2"
      >
        <CircleDollarSign size={16} className="text-blue-400" />
        <div>
          <span className="text-gray-400 text-xs">XRP</span>
          <div className="text-sm">Send Funds</div>
        </div>
      </button>

      {/* Transaction Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl overflow-hidden">
              {/* Modal Header */}
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
                      Send Funds to Synapse
                    </>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
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
                  /* Success View */
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      Transfer Complete!
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Successfully transferred {amount} XRP to Synapse wallet.
                    </p>

                    {/* Transaction Details */}
                    <div className="bg-gray-900/60 rounded-lg p-4 mb-4 text-left">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Amount</span>
                        <span className="font-medium">{amount} XRP</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">
                          Transaction Hash
                        </span>
                        <span className="font-mono text-xs text-blue-400 truncate max-w-32">
                          {txHash}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Status</span>
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <Check size={12} /> Confirmed
                        </span>
                      </div>
                    </div>

                    {/* View on Explorer Button */}
                    <a
                      href={`https://testnet.xrpl.org/transactions/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 transition-colors p-3 rounded-lg mb-2"
                    >
                      View on XRPL Explorer
                    </a>

                    <button
                      onClick={() => setShowModal(false)}
                      className="block w-full text-center bg-gray-700 hover:bg-gray-600 transition-colors p-3 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                ) : !isWalletConnected ? (
                  /* Connect Wallet View */
                  <div className="text-center">
                    <div className="mb-6 bg-blue-900/20 border border-blue-800/30 rounded-lg p-6">
                      <Lock size={40} className="mx-auto mb-4 text-blue-400" />
                      <h3 className="text-lg font-bold mb-2">
                        Connect to XRP Testnet
                      </h3>
                      <p className="text-sm text-gray-400">
                        Connect a wallet to send XRP to the Synapse protocol.
                        For demonstration purposes, we&apos;ll create a testnet
                        wallet funded with test XRP.
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
                          Creating Testnet Wallet...
                        </span>
                      ) : (
                        "Connect Testnet Wallet"
                      )}
                    </button>
                  </div>
                ) : (
                  /* Send Transaction View */
                  <div>
                    {/* Wallet Info */}
                    <div className="mb-4 bg-gray-900/60 p-4 rounded-lg border border-gray-700/50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">
                          Wallet Address
                        </div>
                        <div className="font-mono text-sm flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                          {walletAddress.substring(0, 6)}...
                          {walletAddress.substring(walletAddress.length - 4)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          Available Balance
                        </div>
                        <div className="font-medium text-lg">
                          {walletBalance.toFixed(2)} XRP
                        </div>
                      </div>
                    </div>

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
                        <div className="font-medium">Synapse Protocol</div>
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
                        onClick={sendTransaction}
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
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default UserWalletTransaction;
