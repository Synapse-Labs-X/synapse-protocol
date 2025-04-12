"use client";

import React from "react";
import CrossmarkWalletSDK from "./CrossmarkWalletSDK";

interface TopUpButtonProps {
  onBalanceUpdate: (newAmount: number) => void;
  currentBalance: number;
  className?: string;
}

const TopUpButton: React.FC<TopUpButtonProps> = ({
  onBalanceUpdate,
  currentBalance,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  className = "",
}) => {
  const handleBalanceUpdate = (amount: number) => {
    onBalanceUpdate(amount);
  };

  return (
    <CrossmarkWalletSDK
      onBalanceUpdate={handleBalanceUpdate}
      currentBalance={currentBalance}
    />
  );
};

export default TopUpButton;
