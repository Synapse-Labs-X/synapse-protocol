"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { Agent } from "@/types/agent";
import TransactionModal from "../transactions/TransactionModal";

interface TransactionButtonProps {
  sourceAgent: Agent;
  targetAgent: Agent;
  onTransactionComplete?: (txHash: string) => void;
  className?: string;
  disabled?: boolean;
}

const TransactionButton: React.FC<TransactionButtonProps> = ({
  sourceAgent,
  targetAgent,
  onTransactionComplete,
  className = "",
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleTransactionSuccess = (txHash: string) => {
    if (onTransactionComplete) {
      onTransactionComplete(txHash);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
        disabled={disabled}
        title={disabled ? "Transaction not available" : "Send RLUSD"}
      >
        <Send size={16} />
        <span>Send RLUSD</span>
      </button>

      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          sourceAgent={sourceAgent}
          targetAgent={targetAgent}
          onSuccess={handleTransactionSuccess}
        />
      )}
    </>
  );
};

export default TransactionButton;
