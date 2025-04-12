"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
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

  // Color based on agent type
  const getAgentColor = (type: string): string => {
    const colors: Record<string, string> = {
      main: "#FF6B6B",
      text: "#4ECDC4",
      image: "#00BFFF",
      data: "#FFF35C",
      assistant: "#9D5CFF",
    };
    return colors[type] || "#999";
  };

  const sourceColor = getAgentColor(sourceAgent.type);
  const targetColor = getAgentColor(targetAgent.type);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-gray-800 rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-700/70 overflow-hidden transition-all transform scale-100 opacity-100">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
          <div className="p-5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Send RLUSD</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {txHash ? (
          <div className="p-6">
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-green-400 font-bold">
                    Transaction Successful
                  </h3>
                  <p className="text-sm mt-1 text-gray-300">
                    Your transaction has been successfully submitted.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">
                Transaction Hash:
              </div>
              <div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 font-mono text-sm overflow-x-auto text-gray-300">
                {txHash}
              </div>
            </div>

            <div className="bg-gray-900/40 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <div
                    className="inline-block w-10 h-10 rounded-full"
                    style={{ backgroundColor: `${sourceColor}22` }}
                  >
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <span
                        className="font-medium text-lg"
                        style={{ color: sourceColor }}
                      >
                        {sourceAgent.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    {sourceAgent.name}
                  </div>
                </div>

                <div className="flex-shrink-0 px-3">
                  <ArrowRight size={20} className="text-gray-400" />
                </div>

                <div className="text-center flex-1">
                  <div
                    className="inline-block w-10 h-10 rounded-full"
                    style={{ backgroundColor: `${targetColor}22` }}
                  >
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <span
                        className="font-medium text-lg"
                        style={{ color: targetColor }}
                      >
                        {targetAgent.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    {targetAgent.name}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="px-4 py-2 bg-blue-900/30 border border-blue-800/30 rounded-lg">
                  <span className="font-mono font-medium text-lg">
                    {formatCurrency(parseFloat(amount))}
                  </span>
                </div>
              </div>

              {memo && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="text-xs text-gray-400 mb-1">Memo:</div>
                  <div className="text-sm">{memo}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {txHash !== "simulated-tx" && (
                <a
                  href={`https://testnet.xrpl.org/transactions/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors text-center flex items-center justify-center gap-2"
                >
                  <span>View on Explorer</span>
                  <ExternalLink size={14} />
                </a>
              )}

              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-colors text-center"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: `${sourceColor}22` }}
                >
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <span
                      className="font-medium text-xl"
                      style={{ color: sourceColor }}
                    >
                      {sourceAgent.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium">
                  {sourceAgent.name}
                </div>
                <div className="text-xs text-gray-400">
                  {formatCurrency(sourceAgent.balance)}
                </div>
              </div>

              <div className="flex-shrink-0 px-4">
                <div className="w-8 h-8 rounded-full bg-gray-700/60 flex items-center justify-center">
                  <Send size={14} className="text-gray-300" />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: `${targetColor}22` }}
                >
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <span
                      className="font-medium text-xl"
                      style={{ color: targetColor }}
                    >
                      {targetAgent.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium">
                  {targetAgent.name}
                </div>
                <div className="text-xs text-gray-400">
                  {formatCurrency(targetAgent.balance)}
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Amount
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
                  max={sourceAgent.balance.toString()}
                  required
                  disabled={isProcessing}
                />
                <div className="absolute right-3 top-3 text-gray-400 font-medium">
                  RLUSD
                </div>
              </div>
              <div className="mt-1.5 text-xs text-gray-500 flex justify-between">
                <span>Min: 0.01 RLUSD</span>
                <span>Available: {formatCurrency(sourceAgent.balance)}</span>
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="memo"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Memo (Optional)
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-700/70 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add a note to this transaction"
                rows={2}
                maxLength={100}
                disabled={isProcessing}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 mb-5 flex items-start">
                <AlertCircle
                  size={18}
                  className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium ${
                  isProcessing
                    ? "bg-blue-800/70 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } transition-colors flex items-center justify-center gap-2`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send Transaction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;
