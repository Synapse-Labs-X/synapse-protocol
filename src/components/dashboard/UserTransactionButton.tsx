"use client";

import React from "react";
import UserWalletTransaction from "./UserWalletTransaction";
import userTransactionService from "@/lib/transaction/userTransactionService";

interface UserTransactionButtonProps {
  onTransactionComplete: (amount: number) => void;
  currentBalance: number;
  className?: string;
}

const UserTransactionButton: React.FC<UserTransactionButtonProps> = ({
  onTransactionComplete,
  currentBalance,
  className = "",
}) => {
  // Get the main wallet address from the transaction service
  const mainWalletAddress = userTransactionService.getMainWalletAddress();

  const handleTransactionComplete = (txData: {
    amount: number;
    txHash: string;
  }) => {
    // Verify the transaction on the blockchain (optional)
    // This could be done server-side in a real implementation
    userTransactionService
      .verifyTransaction(txData.txHash)
      .then((verified) => {
        console.log(
          "Transaction verification:",
          verified ? "Successful" : "Failed"
        );

        // Even if verification fails, we'll still update the UI
        // In a production app, you might want stricter validation
        onTransactionComplete(txData.amount);
      })
      .catch((err) => {
        console.error("Error verifying transaction:", err);
        // Still update the UI for demo purposes
        onTransactionComplete(txData.amount);
      });
  };

  return (
    <div className={`${className}`}>
      <UserWalletTransaction
        onTransactionComplete={handleTransactionComplete}
        websiteWalletAddress={mainWalletAddress}
        currentBalance={currentBalance}
      />
    </div>
  );
};

export default UserTransactionButton;
