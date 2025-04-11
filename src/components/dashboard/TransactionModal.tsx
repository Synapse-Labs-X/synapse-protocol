"use client";

import React, { useState } from "react";
import { X, Send, AlertCircle } from "lucide-react";
import { Agent } from "@/types/agent";
import { formatCurrency } from "@/lib/utils/formatters";
import transactionService from "@/lib/xrp/transactionService";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAgent: Agent;
  targetAgent: Agent;
  onSuccess: (txHash: string) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  sourceAgent,
  targetAgent,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>("1");
  const [memo, setMemo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Convert amount to number
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      if (numAmount > sourceAgent.balance) {
        throw new Error(
          `Insufficient balance. Available: ${formatCurrency(
            sourceAgent.balance
          )}`
        );
      }

      // Execute transaction
      const response = await transactionService.executeTransaction({
        fromAgentId: sourceAgent.id,
        toAgentId: targetAgent.id,
        amount: numAmount,
        currency: "RLUSD",
        memo: memo || undefined,
      });

      if (response.success) {
        setTxHash(response.transaction.xrpTxHash || "simulated-tx");
        onSuccess(response.transaction.xrpTxHash || "simulated-tx");
      } else {
        throw new Error(response.error || "Transaction failed");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(
        err.message || "An error occurred while processing the transaction"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Send RLUSD</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {txHash ? (
          <div className="p-6">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
              <h3 className="text-green-400 font-bold flex items-center">
                <span className="bg-green-500 rounded-full p-1 mr-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </span>
                Transaction Successful
              </h3>
              <p className="text-sm mt-2 text-gray-300">
                Your transaction has been successfully submitted to the XRP
                Ledger.
              </p>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">
                Transaction Hash:
              </div>
              <div className="bg-gray-900 rounded p-2 font-mono text-sm overflow-x-auto">
                {txHash}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400">From:</div>
                <div className="font-medium">{sourceAgent.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">To:</div>
                <div className="font-medium">{targetAgent.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Amount:</div>
                <div className="font-medium">
                  {formatCurrency(parseFloat(amount))}
                </div>
              </div>
            </div>

            {txHash !== "simulated-tx" && (
              <a
                href={`https://testnet.xrpl.org/transactions/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-center"
              >
                View on XRP Ledger Explorer
              </a>
            )}

            <button
              onClick={onClose}
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors text-center mt-2"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">From</div>
                <div className="font-medium">{sourceAgent.name}</div>
              </div>
              <Send size={20} className="text-gray-500" />
              <div className="p-3 bg-gray-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">To</div>
                <div className="font-medium">{targetAgent.name}</div>
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Amount
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
                  max={sourceAgent.balance.toString()}
                  required
                  disabled={isProcessing}
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  RLUSD
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Available balance: {formatCurrency(sourceAgent.balance)}
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="memo"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Memo (Optional)
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add a note to this transaction"
                rows={2}
                maxLength={100}
                disabled={isProcessing}
              />
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
              type="submit"
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
                  Processing...
                </span>
              ) : (
                "Send Transaction"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;
